// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LakomiVault
 * @author Lakomi Protocol
 * @notice Treasury management for the Lakomi cooperative (koperasi)
 * @dev UU 25/1992 compliant: Simpanan Pokok, Simpanan Wajib, Simpanan Sukarela, SHU distribution
 *
 * Compliance (UU 25/1992):
 * - Pasal 22(2): Simpanan Pokok (one-time on join) + Simpanan Wajib (periodic mandatory)
 * - Pasal 41: Three types of simpanan (Pokok, Wajib, Sukarela)
 * - Pasal 45: SHU (Sisa Hasil Usaha) = Revenue - Costs, distributed by contribution
 */
contract LakomiVault is AccessControl, ReentrancyGuard, Pausable {

    using SafeERC20 for IERC20;

    // ============================================================
    //                        ROLES
    // ============================================================

    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 public constant GOVERN_ROLE = keccak256("GOVERN_ROLE");
    bytes32 public constant LOAN_ROLE = keccak256("LOAN_ROLE");

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    IERC20 public immutable stableToken;

    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    mapping(address => uint256) public contributions;
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    uint256 public withdrawalThreshold;
    uint256 public withdrawalTimelock;

    struct PendingWithdrawal {
        address recipient;
        uint256 amount;
        uint256 timestamp;
        uint256 executableAt;
        bool executed;
        bool approved;
    }

    mapping(uint256 => PendingWithdrawal) public pendingWithdrawals;
    uint256 public nextWithdrawalId;

    address public lakomiToken;
    address public lakomiGovern;

    // ============================================================
    //              SIMPANAN (UU 25/1992 Pasal 41)
    // ============================================================

    uint256 public simpananPokokAmount;
    uint256 public simpananWajibAmount;
    uint256 public simpananWajibPeriod;
    uint256 public constant TIER2_THRESHOLD = 500 * 10**6;
    uint256 public constant TIER3_THRESHOLD = 2000 * 10**6;

    mapping(address => uint256) public simpananPokok;
    mapping(address => uint256) public simpananWajibTotal;
    mapping(address => uint256) public simpananWajibLastPaid;
    mapping(address => uint256) public simpananWajibPeriodsPaid;
    mapping(address => uint256) public firstDepositTime;

    // ============================================================
    //              SHU (UU 25/1992 Pasal 45)
    // ============================================================

    uint256 public accumulatedRevenue;
    uint256 public totalSHUDistributed;
    uint256 public shuDistributionPeriod;
    uint256 public lastSHUDistribution;
    uint256 public operationalReserveBps;

    struct SHUDistribution {
        uint256 totalAmount;
        uint256 memberCount;
        uint256 timestamp;
        uint256 perShare;
    }

    mapping(uint256 => SHUDistribution) public shuDistributions;
    uint256 public shuDistributionCount;

    mapping(address => uint256) public shuClaimed;
    mapping(address => uint256) public shuPending;

    mapping(uint256 => mapping(address => bool)) public shuClaimedForDistribution;

    // ============================================================
    //                        EVENTS
    // ============================================================

    event Deposited(address indexed member, uint256 amount, uint256 shares, uint256 timestamp);
    event Withdrawn(address indexed member, uint256 amount, uint256 shares, uint256 timestamp);
    event WithdrawalRequested(uint256 indexed id, address indexed recipient, uint256 amount, uint256 executableAt);
    event WithdrawalExecuted(uint256 indexed id, address recipient, uint256 amount);
    event WithdrawalCanceled(uint256 indexed id);
    event GovernanceSpend(address indexed to, uint256 amount, bytes reason);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event TimelockUpdated(uint256 oldTimelock, uint256 newTimelock);
    event TokenSet(address indexed token);
    event GovernSet(address indexed govern);
    event ContributionTierUpdated(address indexed member, uint8 tier);

    event SimpananPokokPaid(address indexed member, uint256 amount, uint256 timestamp);
    event SimpananWajibPaid(address indexed member, uint256 amount, uint256 periods, uint256 timestamp);
    event SimpananPokokAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event SimpananWajibAmountUpdated(uint256 oldAmount, uint256 newAmount);

    event RevenueReceived(uint256 amount, uint256 timestamp);
    event SHUDistributed(uint256 indexed distributionId, uint256 totalAmount, uint256 memberCount, uint256 perShare);
    event SHUClaimed(address indexed member, uint256 indexed distributionId, uint256 amount);

    // ============================================================
    //                        ERRORS
    // ============================================================

    error LakomiVault__ZeroAddress();
    error LakomiVault__ZeroAmount();
    error LakomiVault__InsufficientBalance();
    error LakomiVault__InsufficientShares();
    error LakomiVault__ExceedsThreshold();
    error LakomiVault__TimelockNotMet();
    error LakomiVault__AlreadyExecuted();
    error LakomiVault__NotApproved();
    error LakomiVault__InvalidWithdrawal();
    error LakomiVault__AlreadySet();
    error LakomiVault__TransferFailed();
    error LakomiVault__NotMember();
    error LakomiVault__SimpananPokokNotPaid();
    error LakomiVault__SimpananPokokAlreadyPaid();
    error LakomiVault__SimpananWajibNotDue();
    error LakomiVault__NoSHUToClaim();
    error LakomiVault__NoRevenueToDistribute();

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    constructor(
        address _stableToken,
        uint256 _withdrawalThreshold,
        uint256 _withdrawalTimelock,
        uint256 _simpananPokokAmount,
        uint256 _simpananWajibAmount,
        uint256 _simpananWajibPeriod
    ) {
        if (_stableToken == address(0)) revert LakomiVault__ZeroAddress();

        stableToken = IERC20(_stableToken);
        withdrawalThreshold = _withdrawalThreshold;
        withdrawalTimelock = _withdrawalTimelock;

        simpananPokokAmount = _simpananPokokAmount;
        simpananWajibAmount = _simpananWajibAmount;
        simpananWajibPeriod = _simpananWajibPeriod;

        operationalReserveBps = 1000; // 10% reserve
        shuDistributionPeriod = 365 days;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);
    }

    // ============================================================
    //               SIMPANAN POKOK (UU 25/1992 Pasal 41(1))
    // ============================================================

    function paySimpananPokok(address member) external nonReentrant {
        if (simpananPokok[member] > 0) revert LakomiVault__SimpananPokokAlreadyPaid();

        stableToken.safeTransferFrom(member, address(this), simpananPokokAmount);

        simpananPokok[member] = simpananPokokAmount;
        contributions[member] += simpananPokokAmount;
        totalDeposited += simpananPokokAmount;

        if (firstDepositTime[member] == 0) {
            firstDepositTime[member] = block.timestamp;
        }

        emit SimpananPokokPaid(member, simpananPokokAmount, block.timestamp);
    }

    function hasPaidSimpananPokok(address member) external view returns (bool) {
        return simpananPokok[member] > 0;
    }

    // ============================================================
    //               SIMPANAN WAJIB (UU 25/1992 Pasal 41(2))
    // ============================================================

    function paySimpananWajib() external nonReentrant whenNotPaused {
        if (simpananPokok[msg.sender] == 0) revert LakomiVault__SimpananPokokNotPaid();

        stableToken.safeTransferFrom(msg.sender, address(this), simpananWajibAmount);

        simpananWajibTotal[msg.sender] += simpananWajibAmount;
        simpananWajibPeriodsPaid[msg.sender]++;
        simpananWajibLastPaid[msg.sender] = block.timestamp;
        contributions[msg.sender] += simpananWajibAmount;
        totalDeposited += simpananWajibAmount;

        emit SimpananWajibPaid(msg.sender, simpananWajibAmount, simpananWajibPeriodsPaid[msg.sender], block.timestamp);
    }

    function getSimpananWajibPeriodsOwed(address member) external view returns (uint256) {
        if (simpananPokok[member] == 0) return 0;
        if (firstDepositTime[member] == 0) return 0;

        uint256 elapsed = block.timestamp - firstDepositTime[member];
        uint256 periodsElapsed = elapsed / simpananWajibPeriod;
        if (periodsElapsed > simpananWajibPeriodsPaid[member]) {
            return periodsElapsed - simpananWajibPeriodsPaid[member];
        }
        return 0;
    }

    function isSimpananWajibCurrent(address member) external view returns (bool) {
        uint256 owed = this.getSimpananWajibPeriodsOwed(member);
        return owed == 0;
    }

    // ============================================================
    //            SIMPANAN SUKARELA (UU 25/1992 Pasal 41(3))
    // ============================================================

    function deposit(uint256 amount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 sharesIssued)
    {
        if (amount == 0) revert LakomiVault__ZeroAmount();
        if (simpananPokok[msg.sender] == 0) revert LakomiVault__SimpananPokokNotPaid();

        uint256 totalAssets = getTotalAssets();
        if (totalShares == 0) {
            sharesIssued = amount;
        } else {
            sharesIssued = (amount * totalShares) / totalAssets;
        }

        stableToken.safeTransferFrom(msg.sender, address(this), amount);

        contributions[msg.sender] += amount;
        shares[msg.sender] += sharesIssued;
        totalShares += sharesIssued;
        totalDeposited += amount;

        if (firstDepositTime[msg.sender] == 0) {
            firstDepositTime[msg.sender] = block.timestamp;
        }

        emit Deposited(msg.sender, amount, sharesIssued, block.timestamp);
    }

    function withdraw(uint256 amount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 actualAmount)
    {
        if (amount == 0) revert LakomiVault__ZeroAmount();
        if (amount >= withdrawalThreshold) revert LakomiVault__ExceedsThreshold();
        if (contributions[msg.sender] < amount) revert LakomiVault__InsufficientBalance();

        uint256 sukarela = contributions[msg.sender] - simpananPokok[msg.sender] - simpananWajibTotal[msg.sender];
        if (amount > sukarela) revert LakomiVault__InsufficientBalance();

        uint256 totalAssets = getTotalAssets();
        uint256 sharesToBurn = (amount * totalShares) / totalAssets;

        if (shares[msg.sender] < sharesToBurn) revert LakomiVault__InsufficientShares();

        contributions[msg.sender] -= amount;
        shares[msg.sender] -= sharesToBurn;
        totalShares -= sharesToBurn;
        totalWithdrawn += amount;

        stableToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, sharesToBurn, block.timestamp);

        return amount;
    }

    function requestWithdrawal(address recipient, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 withdrawalId)
    {
        if (recipient == address(0)) revert LakomiVault__ZeroAddress();
        if (amount == 0) revert LakomiVault__ZeroAmount();
        if (amount < withdrawalThreshold) revert LakomiVault__ExceedsThreshold();

        uint256 sukarela = contributions[msg.sender] - simpananPokok[msg.sender] - simpananWajibTotal[msg.sender];
        if (sukarela < amount) revert LakomiVault__InsufficientBalance();

        uint256 executableAt = block.timestamp + withdrawalTimelock;

        withdrawalId = nextWithdrawalId++;
        pendingWithdrawals[withdrawalId] = PendingWithdrawal({
            recipient: recipient,
            amount: amount,
            timestamp: block.timestamp,
            executableAt: executableAt,
            executed: false,
            approved: false
        });

        emit WithdrawalRequested(withdrawalId, recipient, amount, executableAt);
    }

    function approveWithdrawal(uint256 withdrawalId) external onlyRole(GOVERN_ROLE) {
        PendingWithdrawal storage w = pendingWithdrawals[withdrawalId];
        if (w.recipient == address(0)) revert LakomiVault__InvalidWithdrawal();
        if (w.executed) revert LakomiVault__AlreadyExecuted();

        w.approved = true;
    }

    function executeWithdrawal(uint256 withdrawalId) external whenNotPaused nonReentrant {
        PendingWithdrawal storage w = pendingWithdrawals[withdrawalId];

        if (w.recipient == address(0)) revert LakomiVault__InvalidWithdrawal();
        if (w.executed) revert LakomiVault__AlreadyExecuted();
        if (!w.approved) revert LakomiVault__NotApproved();
        if (block.timestamp < w.executableAt) revert LakomiVault__TimelockNotMet();

        uint256 totalAssets = getTotalAssets();
        uint256 sharesToBurn = (w.amount * totalShares) / totalAssets;

        contributions[w.recipient] -= w.amount;
        shares[w.recipient] -= sharesToBurn;
        totalShares -= sharesToBurn;
        totalWithdrawn += w.amount;
        w.executed = true;

        stableToken.safeTransfer(w.recipient, w.amount);

        emit WithdrawalExecuted(withdrawalId, w.recipient, w.amount);
    }

    function cancelWithdrawal(uint256 withdrawalId) external {
        PendingWithdrawal storage w = pendingWithdrawals[withdrawalId];

        if (w.recipient == address(0)) revert LakomiVault__InvalidWithdrawal();
        if (w.executed) revert LakomiVault__AlreadyExecuted();
        if (msg.sender != w.recipient && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender))
            revert LakomiVault__InvalidWithdrawal();

        w.executed = true;
        emit WithdrawalCanceled(withdrawalId);
    }

    function getPendingWithdrawal(uint256 withdrawalId)
        external
        view
        returns (
            address recipient,
            uint256 amount,
            uint256 timestamp,
            uint256 executableAt,
            bool executed,
            bool approved
        )
    {
        PendingWithdrawal storage w = pendingWithdrawals[withdrawalId];
        return (w.recipient, w.amount, w.timestamp, w.executableAt, w.executed, w.approved);
    }

    // ============================================================
    //         SHU DISTRIBUTION (UU 25/1992 Pasal 45)
    // ============================================================

    function receiveRevenue(uint256 amount) external nonReentrant {
        if (amount == 0) revert LakomiVault__ZeroAmount();

        stableToken.safeTransferFrom(msg.sender, address(this), amount);
        accumulatedRevenue += amount;

        emit RevenueReceived(amount, block.timestamp);
    }

    function distributeSHU() external onlyRole(GOVERN_ROLE) nonReentrant {
        if (accumulatedRevenue == 0) revert LakomiVault__NoRevenueToDistribute();

        uint256 reserve = (accumulatedRevenue * operationalReserveBps) / 10000;
        uint256 distributable = accumulatedRevenue - reserve;

        if (distributable == 0) revert LakomiVault__NoRevenueToDistribute();
        if (totalShares == 0) revert LakomiVault__NoRevenueToDistribute();

        uint256 perShare = distributable / totalShares;

        uint256 distId = shuDistributionCount++;
        shuDistributions[distId] = SHUDistribution({
            totalAmount: distributable,
            memberCount: 0,
            timestamp: block.timestamp,
            perShare: perShare
        });

        totalSHUDistributed += distributable;
        accumulatedRevenue = reserve;

        lastSHUDistribution = block.timestamp;

        emit SHUDistributed(distId, distributable, shuDistributions[distId].memberCount, perShare);
    }

    function claimSHU(uint256 distributionId) external nonReentrant {
        if (shuClaimedForDistribution[distributionId][msg.sender])
            revert LakomiVault__NoSHUToClaim();

        SHUDistribution storage dist = shuDistributions[distributionId];
        if (dist.totalAmount == 0) revert LakomiVault__NoSHUToClaim();

        uint256 memberShares = shares[msg.sender];
        if (memberShares == 0) revert LakomiVault__NoSHUToClaim();

        uint256 amount = memberShares * dist.perShare;
        if (amount == 0) revert LakomiVault__NoSHUToClaim();

        shuClaimedForDistribution[distributionId][msg.sender] = true;
        shuClaimed[msg.sender] += amount;

        stableToken.safeTransfer(msg.sender, amount);

        emit SHUClaimed(msg.sender, distributionId, amount);
    }

    function getPendingSHU(address member) external view returns (uint256) {
        uint256 pending = 0;
        for (uint256 i = 0; i < shuDistributionCount; i++) {
            if (!shuClaimedForDistribution[i][member] && shares[member] > 0) {
                pending += shares[member] * shuDistributions[i].perShare;
            }
        }
        return pending;
    }

    // ============================================================
    //                  GOVERNANCE SPENDING
    // ============================================================

    function governanceSpend(
        address to,
        uint256 amount,
        bytes calldata reason
    ) external onlyRole(GOVERN_ROLE) nonReentrant {
        if (to == address(0)) revert LakomiVault__ZeroAddress();
        if (amount == 0) revert LakomiVault__ZeroAmount();
        if (stableToken.balanceOf(address(this)) < amount)
            revert LakomiVault__InsufficientBalance();

        stableToken.safeTransfer(to, amount);

        emit GovernanceSpend(to, amount, reason);
    }

    // ============================================================
    //                    VIEW FUNCTIONS
    // ============================================================

    function getTotalAssets() public view returns (uint256) {
        return stableToken.balanceOf(address(this));
    }

    function getMemberBalance(address member) external view returns (uint256) {
        return contributions[member];
    }

    function getMemberSharePercent(address member) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[member] * 10000) / totalShares;
    }

    function getMemberValue(address member) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[member] * getTotalAssets()) / totalShares;
    }

    function contributionScore(address member) external view returns (uint256) {
        uint256 deposited = contributions[member];
        if (deposited == 0) return 0;

        uint256 depositScore = deposited / 10**6;

        uint256 duration = 0;
        if (firstDepositTime[member] > 0) {
            duration = (block.timestamp - firstDepositTime[member]) / 30 days;
        }

        return depositScore + (duration * 10);
    }

    function getContributionTier(address member) external view returns (uint8) {
        uint256 deposited = contributions[member];
        if (deposited >= TIER3_THRESHOLD) return 3;
        if (deposited >= TIER2_THRESHOLD) return 2;
        return 1;
    }

    function getSimpananSummary(address member) external view returns (
        uint256 pokok,
        uint256 wajibTotal,
        uint256 wajibPeriodsPaid,
        uint256 wajibPeriodsOwed,
        uint256 sukarela,
        uint256 totalContribution
    ) {
        pokok = simpananPokok[member];
        wajibTotal = simpananWajibTotal[member];
        wajibPeriodsPaid = simpananWajibPeriodsPaid[member];
        wajibPeriodsOwed = this.getSimpananWajibPeriodsOwed(member);
        totalContribution = contributions[member];
        sukarela = totalContribution - pokok - wajibTotal;
    }

    // ============================================================
    //                  ADMIN FUNCTIONS
    // ============================================================

    function setWithdrawalThreshold(uint256 newThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldThreshold = withdrawalThreshold;
        withdrawalThreshold = newThreshold;
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    function setWithdrawalTimelock(uint256 newTimelock) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldTimelock = withdrawalTimelock;
        withdrawalTimelock = newTimelock;
        emit TimelockUpdated(oldTimelock, newTimelock);
    }

    function setLakomiToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0)) revert LakomiVault__ZeroAddress();
        if (lakomiToken != address(0)) revert LakomiVault__AlreadySet();
        lakomiToken = token;
        emit TokenSet(token);
    }

    function setLakomiGovern(address govern) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (govern == address(0)) revert LakomiVault__ZeroAddress();
        if (lakomiGovern != address(0)) revert LakomiVault__AlreadySet();
        lakomiGovern = govern;
        emit GovernSet(govern);
    }

    function setSimpananPokokAmount(uint256 newAmount) external onlyRole(GOVERN_ROLE) {
        uint256 old = simpananPokokAmount;
        simpananPokokAmount = newAmount;
        emit SimpananPokokAmountUpdated(old, newAmount);
    }

    function setSimpananWajibAmount(uint256 newAmount) external onlyRole(GOVERN_ROLE) {
        uint256 old = simpananWajibAmount;
        simpananWajibAmount = newAmount;
        emit SimpananWajibAmountUpdated(old, newAmount);
    }

    function setOperationalReserveBps(uint256 newBps) external onlyRole(GOVERN_ROLE) {
        require(newBps <= 5000, "Max 50% reserve");
        operationalReserveBps = newBps;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        IERC20(token).safeTransfer(to, amount);
    }

    function approveUSDCSpending(address spender, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        stableToken.forceApprove(spender, amount);
    }
}
