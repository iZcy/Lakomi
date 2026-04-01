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
 * @notice Treasury management for the Lakomi community
 * @dev Handles deposits, withdrawals, share tracking, and fund management
 *
 * Key Features:
 * - Members deposit USDC (stablecoin)
 * - Tracks ownership shares
 * - Timelocked large withdrawals
 * - Emergency pause functionality
 * - DAO-approved spending
 */
contract LakomiVault is AccessControl, ReentrancyGuard, Pausable {

    using SafeERC20 for IERC20;

    // ============================================================
    //                        ROLES
    // ============================================================

    /// @dev Role for managing treasury operations
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

    /// @dev Role for governance-approved spending
    bytes32 public constant GOVERN_ROLE = keccak256("GOVERN_ROLE");

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    /// @dev USDC token (or other stablecoin)
    IERC20 public immutable stableToken;

    /// @dev Total assets ever deposited
    uint256 public totalDeposited;

    /// @dev Total assets ever withdrawn
    uint256 public totalWithdrawn;

    /// @dev Member contributions
    mapping(address => uint256) public contributions;

    /// @dev Total shares issued
    uint256 public totalShares;

    /// @dev Member shares (ownership percentage)
    mapping(address => uint256) public shares;

    /// @dev Threshold for auto-approval (withdrawals under this are instant)
    uint256 public withdrawalThreshold;

    /// @dev Timelock duration for large withdrawals (in seconds)
    uint256 public withdrawalTimelock;

    /// @dev Pending withdrawals awaiting timelock
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

    /// @dev LakomiToken contract address
    address public lakomiToken;

    /// @dev LakomiGovern contract address
    address public lakomiGovern;

    // ============================================================
    //               CONTRIBUTION TIER SYSTEM
    // ============================================================

    /// @dev Tier thresholds for contribution scoring (in USDC, 6 decimals)
    uint256 public constant TIER2_THRESHOLD = 500 * 10**6;  // 500 USDC for Tier 2
    uint256 public constant TIER3_THRESHOLD = 2000 * 10**6; // 2000 USDC for Tier 3

    /// @dev Track first deposit timestamp per member for score calculation
    mapping(address => uint256) public firstDepositTime;

    // ============================================================
    //                        EVENTS
    // ============================================================

    event Deposited(address indexed member, uint256 amount, uint256 shares, uint256 timestamp);
    event Withdrawn(address indexed member, uint256 amount, uint256 shares, uint256 timestamp);
    event WithdrawalRequested(
        uint256 indexed id,
        address indexed recipient,
        uint256 amount,
        uint256 executableAt
    );
    event WithdrawalExecuted(uint256 indexed id, address recipient, uint256 amount);
    event WithdrawalCanceled(uint256 indexed id);
    event GovernanceSpend(address indexed to, uint256 amount, bytes reason);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event TimelockUpdated(uint256 oldTimelock, uint256 newTimelock);
    event TokenSet(address indexed token);
    event GovernSet(address indexed govern);
    event ContributionTierUpdated(address indexed member, uint8 tier);

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

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    /**
     * @dev Initialize vault with stable token
     * @param _stableToken Address of USDC or other stablecoin
     * @param _withdrawalThreshold Initial threshold for auto-approval
     * @param _withdrawalTimelock Initial timelock in seconds (48 hours default)
     */
    constructor(
        address _stableToken,
        uint256 _withdrawalThreshold,
        uint256 _withdrawalTimelock
    ) {
        if (_stableToken == address(0)) revert LakomiVault__ZeroAddress();

        stableToken = IERC20(_stableToken);
        withdrawalThreshold = _withdrawalThreshold;
        withdrawalTimelock = _withdrawalTimelock;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);
    }

    // ============================================================
    //                    CORE FUNCTIONS
    // ============================================================

    /**
     * @notice Deposits stablecoins into the vault
     * @param amount The amount to deposit
     * @return sharesIssued The number of shares issued
     */
    function deposit(uint256 amount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 sharesIssued)
    {
        if (amount == 0) revert LakomiVault__ZeroAmount();

        // Calculate shares
        uint256 totalAssets = getTotalAssets();
        if (totalShares == 0) {
            sharesIssued = amount;
        } else {
            sharesIssued = (amount * totalShares) / totalAssets;
        }

        // Transfer tokens
        stableToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update state
        contributions[msg.sender] += amount;
        shares[msg.sender] += sharesIssued;
        totalShares += sharesIssued;
        totalDeposited += amount;

        // Track first deposit time
        if (firstDepositTime[msg.sender] == 0) {
            firstDepositTime[msg.sender] = block.timestamp;
        }

        emit Deposited(msg.sender, amount, sharesIssued, block.timestamp);
    }

    /**
     * @notice Withdraws stablecoins from the vault (under threshold)
     * @param amount The amount to withdraw
     * @return actualAmount The actual amount withdrawn
     */
    function withdraw(uint256 amount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 actualAmount)
    {
        if (amount == 0) revert LakomiVault__ZeroAmount();
        if (amount >= withdrawalThreshold) revert LakomiVault__ExceedsThreshold();

        // Check member has enough contribution
        if (contributions[msg.sender] < amount) revert LakomiVault__InsufficientBalance();

        // Calculate shares to burn
        uint256 totalAssets = getTotalAssets();
        uint256 sharesToBurn = (amount * totalShares) / totalAssets;

        if (shares[msg.sender] < sharesToBurn) revert LakomiVault__InsufficientShares();

        // Update state
        contributions[msg.sender] -= amount;
        shares[msg.sender] -= sharesToBurn;
        totalShares -= sharesToBurn;
        totalWithdrawn += amount;

        // Transfer tokens
        stableToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, sharesToBurn, block.timestamp);

        return amount;
    }

    /**
     * @notice Requests a withdrawal above threshold (requires timelock)
     * @param recipient The address to receive funds
     * @param amount The amount to withdraw
     * @return withdrawalId The ID of the pending withdrawal
     */
    function requestWithdrawal(address recipient, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 withdrawalId)
    {
        if (recipient == address(0)) revert LakomiVault__ZeroAddress();
        if (amount == 0) revert LakomiVault__ZeroAmount();
        if (amount < withdrawalThreshold) revert LakomiVault__ExceedsThreshold();
        if (contributions[msg.sender] < amount) revert LakomiVault__InsufficientBalance();

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

    /**
     * @notice Approves a pending withdrawal (governance only)
     * @param withdrawalId The ID of the withdrawal
     */
    function approveWithdrawal(uint256 withdrawalId)
        external
        onlyRole(GOVERN_ROLE)
    {
        PendingWithdrawal storage w = pendingWithdrawals[withdrawalId];
        if (w.recipient == address(0)) revert LakomiVault__InvalidWithdrawal();
        if (w.executed) revert LakomiVault__AlreadyExecuted();

        w.approved = true;
    }

    /**
     * @notice Executes an approved withdrawal after timelock
     * @param withdrawalId The ID of the withdrawal
     */
    function executeWithdrawal(uint256 withdrawalId)
        external
        whenNotPaused
        nonReentrant
    {
        PendingWithdrawal storage w = pendingWithdrawals[withdrawalId];

        if (w.recipient == address(0)) revert LakomiVault__InvalidWithdrawal();
        if (w.executed) revert LakomiVault__AlreadyExecuted();
        if (!w.approved) revert LakomiVault__NotApproved();
        if (block.timestamp < w.executableAt) revert LakomiVault__TimelockNotMet();

        // Calculate shares to burn
        uint256 totalAssets = getTotalAssets();
        uint256 sharesToBurn = (w.amount * totalShares) / totalAssets;

        // Update state
        contributions[w.recipient] -= w.amount;
        shares[w.recipient] -= sharesToBurn;
        totalShares -= sharesToBurn;
        totalWithdrawn += w.amount;
        w.executed = true;

        // Transfer tokens
        stableToken.safeTransfer(w.recipient, w.amount);

        emit WithdrawalExecuted(withdrawalId, w.recipient, w.amount);
    }

    /**
     * @notice Cancels a pending withdrawal
     * @param withdrawalId The ID of the withdrawal
     */
    function cancelWithdrawal(uint256 withdrawalId) external {
        PendingWithdrawal storage w = pendingWithdrawals[withdrawalId];

        if (w.recipient == address(0)) revert LakomiVault__InvalidWithdrawal();
        if (w.executed) revert LakomiVault__AlreadyExecuted();
        if (msg.sender != w.recipient && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender))
            revert LakomiVault__InvalidWithdrawal();

        w.executed = true; // Mark as processed
        emit WithdrawalCanceled(withdrawalId);
    }

    // ============================================================
    //                    VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Gets a pending withdrawal details
     * @param withdrawalId The withdrawal ID
     * @return recipient The recipient address
     * @return amount The withdrawal amount
     * @return timestamp The request timestamp
     * @return executableAt When it can be executed
     * @return executed Whether it has been executed
     * @return approved Whether it has been approved
     */
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
        return (
            w.recipient,
            w.amount,
            w.timestamp,
            w.executableAt,
            w.executed,
            w.approved
        );
    }

    // ============================================================
    //                 GOVERNANCE SPENDING
    // ============================================================

    /**
     * @notice Spend funds approved by governance
     * @dev Only callable by GOVERN_ROLE (LakomiGovern)
     * @param to The recipient address
     * @param amount The amount to spend
     * @param reason Description of the spending
     */
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

    /**
     * @notice Gets the current total assets in the vault
     * @return Total stablecoin balance
     */
    function getTotalAssets() public view returns (uint256) {
        return stableToken.balanceOf(address(this));
    }

    /**
     * @notice Gets a member's contribution balance
     * @param member The member address
     * @return The contribution amount
     */
    function getMemberBalance(address member) external view returns (uint256) {
        return contributions[member];
    }

    /**
     * @notice Gets a member's ownership percentage
     * @param member The member address
     * @return The percentage in basis points (10000 = 100%)
     */
    function getMemberSharePercent(address member) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[member] * 10000) / totalShares;
    }

    /**
     * @notice Gets a member's proportional value
     * @param member The member address
     * @return The value in stablecoins
     */
    function getMemberValue(address member) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[member] * getTotalAssets()) / totalShares;
    }

    // ============================================================
    //                  ADMIN FUNCTIONS
    // ============================================================

    /**
     * @notice Sets the withdrawal threshold
     * @param newThreshold The new threshold amount
     */
    function setWithdrawalThreshold(uint256 newThreshold)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 oldThreshold = withdrawalThreshold;
        withdrawalThreshold = newThreshold;
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    /**
     * @notice Sets the withdrawal timelock
     * @param newTimelock The new timelock in seconds
     */
    function setWithdrawalTimelock(uint256 newTimelock)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 oldTimelock = withdrawalTimelock;
        withdrawalTimelock = newTimelock;
        emit TimelockUpdated(oldTimelock, newTimelock);
    }

    /**
     * @notice Sets the LakomiToken contract address
     * @param token The token address
     */
    function setLakomiToken(address token)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (token == address(0)) revert LakomiVault__ZeroAddress();
        if (lakomiToken != address(0)) revert LakomiVault__AlreadySet();
        lakomiToken = token;
        emit TokenSet(token);
    }

    /**
     * @notice Sets the LakomiGovern contract address
     * @param govern The governance address
     */
    function setLakomiGovern(address govern)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (govern == address(0)) revert LakomiVault__ZeroAddress();
        if (lakomiGovern != address(0)) revert LakomiVault__AlreadySet();
        lakomiGovern = govern;
        emit GovernSet(govern);
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Emergency withdrawal of any token
     * @dev For recovery of mistakenly sent tokens
     * @param token The token address
     * @param to The recipient
     * @param amount The amount
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        IERC20(token).safeTransfer(to, amount);
    }

    // ============================================================
    //              CONTRIBUTION SCORE & TIER
    // ============================================================

    /**
     * @notice Calculates a composite contribution score for a member
     * @dev Score factors in total deposited amount and membership duration
     * @param member The member address
     * @return The contribution score (higher = more trusted)
     */
    function contributionScore(address member) external view returns (uint256) {
        uint256 deposited = contributions[member];
        if (deposited == 0) return 0;

        // Base score from deposit amount (in USDC units)
        uint256 depositScore = deposited / 10**6; // normalize to whole USDC

        // Duration bonus: 1 point per 30 days of membership
        uint256 duration = 0;
        if (firstDepositTime[member] > 0) {
            duration = (block.timestamp - firstDepositTime[member]) / 30 days;
        }

        return depositScore + (duration * 10); // duration weighted at 10pts per month
    }

    /**
     * @notice Gets the contribution tier for a member
     * @dev Tier determines max LTV for loans
     * @param member The member address
     * @return tier 1 (new), 2 (moderate), or 3 (high contribution)
     */
    function getContributionTier(address member) external view returns (uint8) {
        uint256 deposited = contributions[member];
        if (deposited >= TIER3_THRESHOLD) return 3;
        if (deposited >= TIER2_THRESHOLD) return 2;
        return 1;
    }
}
