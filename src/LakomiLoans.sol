// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./LakomiToken.sol";
import "./LakomiVault.sol";

/**
 * @title LakomiLoans
 * @author Lakomi Protocol
 * @notice Emergency loan system for Lakomi members
 * @dev Handles loan requests, approvals, disbursements, and repayments
 *
 * Key Features:
 * - Tiered LTV: 30% (Tier 1), 50% (Tier 2), 70% (Tier 3) based on contribution
 * - 5% APY interest rate
 * - 25% collateral in LAK tokens
 * - Auto-approval under threshold
 * - Partial repayments allowed
 */
contract LakomiLoans is AccessControl, ReentrancyGuard, Pausable {

    using SafeERC20 for IERC20;

    // ============================================================
    //                        ENUMS
    // ============================================================

    enum LoanStatus {
        Pending,    // Awaiting approval
        Approved,   // Approved, awaiting disbursement
        Active,     // Disbursed, awaiting repayment
        Repaid,     // Fully repaid
        Defaulted,  // Deadline missed
        Canceled    // Canceled
    }

    // ============================================================
    //                      STRUCTS
    // ============================================================

    struct Loan {
        uint256 id;
        address borrower;
        uint256 principal;         // Amount borrowed
        uint256 interest;          // Interest owed
        uint256 collateralTokens;  // LAK tokens locked
        uint256 startTime;
        uint256 dueTime;
        uint256 repaidAmount;      // Amount repaid so far
        LoanStatus status;
        string reason;
    }

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    /// @dev LakomiToken reference
    LakomiToken public immutable token;

    /// @dev LakomiVault reference
    LakomiVault public immutable vault;

    /// @dev Interest rate in basis points (500 = 5%)
    uint256 public interestRate;

    /// @dev Max loan-to-contribution ratio — now determined per-tier
    uint256 public maxLTV;

    /// @dev Collateral requirement (2500 = 25% of loan)
    uint256 public collateralRatio;

    /// @dev Auto-approval threshold
    uint256 public autoApproveThreshold;

    /// @dev Tiered LTV values in basis points
    uint256 public constant TIER1_LTV = 3000; // 30%
    uint256 public constant TIER2_LTV = 5000; // 50%
    uint256 public constant TIER3_LTV = 7000; // 70%

    /// @dev Default loan duration in seconds
    uint256 public defaultLoanDuration;

    /// @dev Grace period after default (seconds)
    uint256 public gracePeriod;

    /// @dev All loans
    mapping(uint256 => Loan) public loans;

    /// @dev Loan count
    uint256 public loanCount;

    /// @dev Active loan count
    uint256 public activeLoanCount;

    /// @dev Borrower's loan IDs
    mapping(address => uint256[]) public borrowerLoans;

    /// @dev Total borrowed by address
    mapping(address => uint256) public totalBorrowed;

    /// @dev Role for loan approval
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");

    // ============================================================
    //                        EVENTS
    // ============================================================

    event LoanRequested(
        uint256 indexed id,
        address indexed borrower,
        uint256 amount,
        uint256 duration,
        string reason
    );

    event LoanApproved(uint256 indexed id, uint256 collateralRequired);
    event LoanDisbursed(uint256 indexed id, address indexed borrower, uint256 amount);
    event LoanRepaid(
        uint256 indexed id,
        address indexed borrower,
        uint256 amount,
        uint256 remaining
    );
    event LoanDefaulted(uint256 indexed id, address indexed borrower);
    event CollateralClaimed(
        uint256 indexed id,
        address indexed borrower,
        uint256 collateralAmount
    );
    event InterestRateUpdated(uint256 oldRate, uint256 newRate);
    event MaxLTVUpdated(uint256 oldLTV, uint256 newLTV);
    event CollateralRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // ============================================================
    //                        ERRORS
    // ============================================================

    error LakomiLoans__ZeroAddress();
    error LakomiLoans__ZeroAmount();
    error LakomiLoans__InvalidDuration();
    error LakomiLoans__ExceedsMaxLoan();
    error LakomiLoans__InsufficientContribution();
    error LakomiLoans__InsufficientCollateral();
    error LakomiLoans__LoanNotFound();
    error LakomiLoans__LoanNotPending();
    error LakomiLoans__LoanNotApproved();
    error LakomiLoans__LoanNotActive();
    error LakomiLoans__AlreadyRepaid();
    error LakomiLoans__Overpayment();
    error LakomiLoans__NotDefaulted();
    error LakomiLoans__GracePeriodActive();
    error LakomiLoans__TransferFailed();

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    /**
     * @dev Initialize with token and vault references
     * @param _token LakomiToken address
     * @param _vault LakomiVault address
     */
    constructor(
        address _token,
        address _vault
    ) {
        if (_token == address(0) || _vault == address(0))
            revert LakomiLoans__ZeroAddress();

        token = LakomiToken(_token);
        vault = LakomiVault(_vault);

        // Default values
        interestRate = 500;              // 5% APY
        maxLTV = 5000;                   // 50%
        collateralRatio = 2500;          // 25%
        autoApproveThreshold = 200 * 10**6; // 200 USDC
        defaultLoanDuration = 30 days;
        gracePeriod = 7 days;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(APPROVER_ROLE, msg.sender);
    }

    // ============================================================
    //                    CORE FUNCTIONS
    // ============================================================

    /**
     * @notice Requests a new loan
     * @param amount The loan amount
     * @param duration The loan duration in seconds
     * @param reason The reason for the loan
     * @return loanId The ID of the created loan
     */
    function requestLoan(
        uint256 amount,
        uint256 duration,
        string calldata reason
    ) external whenNotPaused nonReentrant returns (uint256 loanId) {
        if (amount == 0) revert LakomiLoans__ZeroAmount();
        if (duration == 0 || duration > 365 days)
            revert LakomiLoans__InvalidDuration();

        // Check contribution
        uint256 contribution = vault.getMemberBalance(msg.sender);
        uint256 borrowerMaxLTV = _calculateMaxLTV(msg.sender);
        uint256 maxLoan = (contribution * borrowerMaxLTV) / 10000;

        if (amount > maxLoan) revert LakomiLoans__ExceedsMaxLoan();
        if (contribution == 0) revert LakomiLoans__InsufficientContribution();

        // Calculate collateral needed
        uint256 collateralNeeded = (amount * collateralRatio) / 10000;
        // Convert USDC amount to LAK token amount (assuming 1:1 for simplicity)
        // In production, you'd use a price oracle
        uint256 collateralInTokens = collateralNeeded * 10**12; // USDC 6 decimals -> LAK 18 decimals

        uint256 availableTokens = token.getAvailableBalance(msg.sender);
        if (availableTokens < collateralInTokens)
            revert LakomiLoans__InsufficientCollateral();

        // Calculate interest
        uint256 interest = calculateInterest(amount, duration);

        loanId = loanCount++;

        loans[loanId] = Loan({
            id: loanId,
            borrower: msg.sender,
            principal: amount,
            interest: interest,
            collateralTokens: collateralInTokens,
            startTime: 0,
            dueTime: 0,
            repaidAmount: 0,
            status: LoanStatus.Pending,
            reason: reason
        });

        borrowerLoans[msg.sender].push(loanId);

        emit LoanRequested(loanId, msg.sender, amount, duration, reason);

        // Auto-approve if under threshold
        if (amount <= autoApproveThreshold) {
            _approveLoan(loanId);
        }
    }

    /**
     * @notice Approves a pending loan
     * @param loanId The ID of the loan
     */
    function approveLoan(uint256 loanId)
        external
        onlyRole(APPROVER_ROLE)
        nonReentrant
    {
        _approveLoan(loanId);
    }

    function _approveLoan(uint256 loanId) internal {
        Loan storage loan = loans[loanId];

        if (loan.borrower == address(0)) revert LakomiLoans__LoanNotFound();
        if (loan.status != LoanStatus.Pending) revert LakomiLoans__LoanNotPending();

        loan.status = LoanStatus.Approved;

        emit LoanApproved(loanId, loan.collateralTokens);
    }

    /**
     * @notice Disburses an approved loan
     * @param loanId The ID of the loan
     */
    function disburse(uint256 loanId) external whenNotPaused nonReentrant {
        Loan storage loan = loans[loanId];

        if (loan.borrower == address(0)) revert LakomiLoans__LoanNotFound();
        if (loan.status != LoanStatus.Approved) revert LakomiLoans__LoanNotApproved();

        token.lockTokens(loan.borrower, loan.collateralTokens);

        loan.status = LoanStatus.Active;
        loan.startTime = block.timestamp;
        loan.dueTime = block.timestamp + defaultLoanDuration;

        activeLoanCount++;
        totalBorrowed[loan.borrower] += loan.principal;

        IERC20 stableToken = IERC20(address(vault.stableToken()));
        stableToken.safeTransferFrom(address(vault), loan.borrower, loan.principal);

        emit LoanDisbursed(loanId, loan.borrower, loan.principal);
    }

    /**
     * @notice Repays part or all of a loan
     * @param loanId The ID of the loan
     * @param amount The amount to repay
     */
    function repay(uint256 loanId, uint256 amount)
        public
        whenNotPaused
        nonReentrant
    {
        Loan storage loan = loans[loanId];

        if (loan.borrower == address(0)) revert LakomiLoans__LoanNotFound();
        if (loan.status != LoanStatus.Active) revert LakomiLoans__LoanNotActive();

        uint256 totalOwed = loan.principal + loan.interest;
        uint256 remaining = totalOwed - loan.repaidAmount;

        if (remaining == 0) revert LakomiLoans__AlreadyRepaid();
        if (amount > remaining) revert LakomiLoans__Overpayment();

        IERC20 stableToken = IERC20(address(vault.stableToken()));
        stableToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 interestPortion = 0;
        if (loan.interest > 0 && totalOwed > 0) {
            uint256 interestRatio = (loan.interest * 1e18) / totalOwed;
            interestPortion = (amount * interestRatio) / 1e18;
        }

        if (interestPortion > 0) {
            stableToken.safeTransfer(address(vault), interestPortion);
            try vault.receiveRevenue(interestPortion) {} catch {}
        }

        uint256 principalPortion = amount - interestPortion;
        if (principalPortion > 0) {
            stableToken.safeTransfer(address(vault), principalPortion);
        }

        loan.repaidAmount += amount;

        if (loan.repaidAmount >= totalOwed) {
            loan.status = LoanStatus.Repaid;
            activeLoanCount--;

            token.unlockTokens(loan.borrower, loan.collateralTokens);
        }

        emit LoanRepaid(loanId, loan.borrower, amount, totalOwed - loan.repaidAmount);
    }

    /**
     * @notice Repays loan in full
     * @param loanId The ID of the loan
     */
    function repayInFull(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        uint256 totalOwed = loan.principal + loan.interest;
        uint256 remaining = totalOwed - loan.repaidAmount;

        repay(loanId, remaining);
    }

    /**
     * @notice Marks a loan as defaulted
     * @param loanId The ID of the loan
     */
    function markDefaulted(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];

        if (loan.borrower == address(0)) revert LakomiLoans__LoanNotFound();
        if (loan.status != LoanStatus.Active) revert LakomiLoans__LoanNotActive();

        if (block.timestamp < loan.dueTime + gracePeriod)
            revert LakomiLoans__GracePeriodActive();

        loan.status = LoanStatus.Defaulted;
        activeLoanCount--;

        emit LoanDefaulted(loanId, loan.borrower);
    }

    /**
     * @notice Claims collateral from a defaulted loan
     * @param loanId The ID of the loan
     */
    function claimCollateral(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];

        if (loan.borrower == address(0)) revert LakomiLoans__LoanNotFound();
        if (loan.status != LoanStatus.Defaulted) revert LakomiLoans__NotDefaulted();

        // Burn the collateral tokens
        token.unlockTokens(loan.borrower, loan.collateralTokens);
        token.burn(loan.borrower, loan.collateralTokens);

        loan.status = LoanStatus.Canceled;

        emit CollateralClaimed(loanId, loan.borrower, loan.collateralTokens);
    }

    // ============================================================
    //                    VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Calculates interest for a loan
     * @param principal The principal amount
     * @param duration The loan duration in seconds
     * @return The interest amount
     */
    function calculateInterest(uint256 principal, uint256 duration)
        public
        view
        returns (uint256)
    {
        // Interest = Principal * Rate * (Duration / Year)
        // Rate is in basis points (500 = 5%)
        uint256 year = 365 days;
        return (principal * interestRate * duration) / (10000 * year);
    }

    /**
     * @notice Gets the max loan amount for a borrower
     * @param borrower The borrower's address
     * @return The maximum loan amount
     */
    function getMaxLoanAmount(address borrower) external view returns (uint256) {
        uint256 contribution = vault.getMemberBalance(borrower);
        uint256 borrowerMaxLTV = _calculateMaxLTV(borrower);
        return (contribution * borrowerMaxLTV) / 10000;
    }

    /**
     * @notice Gets required collateral for a loan amount
     * @param amount The loan amount
     * @return The required collateral in LAK tokens
     */
    function getRequiredCollateral(uint256 amount) external view returns (uint256) {
        uint256 collateralNeeded = (amount * collateralRatio) / 10000;
        return collateralNeeded * 10**12; // Convert to 18 decimals
    }

    /**
     * @notice Gets all loans for a borrower
     * @param borrower The borrower's address
     * @return loanIds Array of loan IDs
     */
    function getBorrowerLoans(address borrower)
        external
        view
        returns (uint256[] memory)
    {
        return borrowerLoans[borrower];
    }

    /**
     * @notice Gets loan details
     * @param loanId The loan ID
     */
    function getLoan(uint256 loanId)
        external
        view
        returns (
            uint256 id,
            address borrower,
            uint256 principal,
            uint256 interest,
            uint256 collateralTokens,
            uint256 startTime,
            uint256 dueTime,
            uint256 repaidAmount,
            uint256 totalOwed,
            uint256 remaining,
            LoanStatus status,
            string memory reason
        )
    {
        Loan storage loan = loans[loanId];
        uint256 owed = loan.principal + loan.interest;
        return (
            loan.id,
            loan.borrower,
            loan.principal,
            loan.interest,
            loan.collateralTokens,
            loan.startTime,
            loan.dueTime,
            loan.repaidAmount,
            owed,
            owed - loan.repaidAmount,
            loan.status,
            loan.reason
        );
    }

    // ============================================================
    //              INTERNAL HELPERS
    // ============================================================

    /**
     * @notice Calculates the max LTV for a borrower based on their contribution tier
     * @param borrower The borrower's address
     * @return The LTV in basis points
     */
    function _calculateMaxLTV(address borrower) internal view returns (uint256) {
        uint8 tier = vault.getContributionTier(borrower);
        if (tier == 3) return TIER3_LTV;
        if (tier == 2) return TIER2_LTV;
        return TIER1_LTV;
    }

    // ============================================================
    //                  ADMIN FUNCTIONS
    // ============================================================

    /**
     * @notice Sets the interest rate
     * @param newRate The new rate in basis points
     */
    function setInterestRate(uint256 newRate)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 oldRate = interestRate;
        interestRate = newRate;
        emit InterestRateUpdated(oldRate, newRate);
    }

    /**
     * @notice Sets the max LTV ratio
     * @param newLTV The new ratio in basis points
     */
    function setMaxLTV(uint256 newLTV) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newLTV <= 10000, "Invalid LTV");
        uint256 oldLTV = maxLTV;
        maxLTV = newLTV;
        emit MaxLTVUpdated(oldLTV, newLTV);
    }

    /**
     * @notice Sets the collateral ratio
     * @param newRatio The new ratio in basis points
     */
    function setCollateralRatio(uint256 newRatio)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 oldRatio = collateralRatio;
        collateralRatio = newRatio;
        emit CollateralRatioUpdated(oldRatio, newRatio);
    }

    /**
     * @notice Sets the auto-approval threshold
     * @param newThreshold The new threshold
     */
    function setAutoApproveThreshold(uint256 newThreshold)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 oldThreshold = autoApproveThreshold;
        autoApproveThreshold = newThreshold;
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    /**
     * @notice Pause loans
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause loans
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
