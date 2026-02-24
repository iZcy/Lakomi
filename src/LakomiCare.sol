// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./LakomiVault.sol";

/**
 * @title LakomiCare
 * @author Lakomi Protocol
 * @notice Benefit claims system for Lakomi members
 * @dev Handles benefit claims, eligibility, limits, and payouts
 *
 * Key Features:
 * - Medical, Unemployment, Education, Housing benefits
 * - Annual limits per benefit type
 * - Cooling-off periods between claims
 * - Auto-approval for eligible claims
 * - IPFS proof integration
 */
contract LakomiCare is AccessControl, ReentrancyGuard, Pausable {

    using SafeERC20 for IERC20;

    // ============================================================
    //                        ENUMS
    // ============================================================

    enum ClaimStatus {
        Pending,    // Awaiting review
        Approved,   // Approved, awaiting payout
        Rejected,   // Rejected
        Paid        // Paid out
    }

    enum BenefitCategory {
        Medical,
        Unemployment,
        Education,
        Housing
    }

    // ============================================================
    //                      STRUCTS
    // ============================================================

    struct BenefitType {
        string name;
        bool enabled;
        uint256 maxAmount;           // Per claim maximum
        uint256 annualLimit;         // Per member annual maximum
        uint256 coolingOffPeriod;    // Seconds between claims
        bool verificationRequired;   // Manual verification needed
    }

    struct MemberUsage {
        uint256 medicalUsed;
        uint256 medicalLastClaim;
        uint256 unemploymentUsed;
        uint256 unemploymentLastClaim;
        uint256 educationUsed;
        uint256 educationLastClaim;
        uint256 housingUsed;
        uint256 housingLastClaim;
        uint256 lastYearReset;
    }

    struct Claim {
        uint256 id;
        address claimant;
        BenefitCategory category;
        uint256 amount;
        string proofHash;          // IPFS hash
        string description;
        uint256 timestamp;
        ClaimStatus status;
        string rejectionReason;
    }

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    /// @dev LakomiVault reference
    LakomiVault public immutable vault;

    /// @dev Benefit types configuration
    mapping(BenefitCategory => BenefitType) public benefitTypes;

    /// @dev Member usage tracking
    mapping(address => MemberUsage) public memberUsage;

    /// @dev All claims
    mapping(uint256 => Claim) public claims;

    /// @dev Claim count
    uint256 public claimCount;

    /// @dev Processing time for auto-approval
    uint256 public processingTime;

    /// @dev Maximum total payout per claim
    uint256 public maxTotalPayout;

    /// @dev Role for claim approval
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");

    // ============================================================
    //                        EVENTS
    // ============================================================

    event ClaimSubmitted(
        uint256 indexed id,
        address indexed claimant,
        BenefitCategory category,
        uint256 amount,
        string proofHash
    );

    event ClaimApproved(uint256 indexed id, address indexed approver);
    event ClaimRejected(uint256 indexed id, string reason);
    event ClaimPaid(uint256 indexed id, address indexed claimant, uint256 amount);
    event BenefitTypeUpdated(BenefitCategory category, bool enabled);
    event BenefitLimitsUpdated(
        BenefitCategory category,
        uint256 maxAmount,
        uint256 annualLimit
    );

    // ============================================================
    //                        ERRORS
    // ============================================================

    error LakomiCare__ZeroAddress();
    error LakomiCare__ZeroAmount();
    error LakomiCare__BenefitDisabled();
    error LakomiCare__ExceedsMaxAmount();
    error LakomiCare__ExceedsAnnualLimit();
    error LakomiCare__CoolingOffNotMet();
    error LakomiCare__NotMember();
    error LakomiCare__ClaimNotFound();
    error LakomiCare__ClaimNotPending();
    error LakomiCare__AlreadyProcessed();
    error LakomiCare__InsufficientFunds();

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    /**
     * @dev Initialize with vault reference
     * @param _vault LakomiVault address
     */
    constructor(address _vault) {
        if (_vault == address(0)) revert LakomiCare__ZeroAddress();

        vault = LakomiVault(_vault);
        processingTime = 24 hours;
        maxTotalPayout = 5000 * 10**6; // 5000 USDC

        // Initialize benefit types
        _initializeBenefitTypes();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(APPROVER_ROLE, msg.sender);
    }

    /**
     * @dev Initialize default benefit types
     */
    function _initializeBenefitTypes() internal {
        // Medical
        benefitTypes[BenefitCategory.Medical] = BenefitType({
            name: "Medical Emergency",
            enabled: true,
            maxAmount: 3000 * 10**6,    // 3000 USDC
            annualLimit: 5000 * 10**6,   // 5000 USDC
            coolingOffPeriod: 90 days,
            verificationRequired: false
        });

        // Unemployment
        benefitTypes[BenefitCategory.Unemployment] = BenefitType({
            name: "Unemployment Support",
            enabled: true,
            maxAmount: 1000 * 10**6,    // 1000 USDC
            annualLimit: 3000 * 10**6,   // 3000 USDC
            coolingOffPeriod: 180 days,
            verificationRequired: true
        });

        // Education
        benefitTypes[BenefitCategory.Education] = BenefitType({
            name: "Education Assistance",
            enabled: true,
            maxAmount: 2000 * 10**6,    // 2000 USDC
            annualLimit: 2000 * 10**6,   // 2000 USDC
            coolingOffPeriod: 365 days,
            verificationRequired: true
        });

        // Housing
        benefitTypes[BenefitCategory.Housing] = BenefitType({
            name: "Housing Assistance",
            enabled: true,
            maxAmount: 2000 * 10**6,    // 2000 USDC
            annualLimit: 4000 * 10**6,   // 4000 USDC
            coolingOffPeriod: 180 days,
            verificationRequired: true
        });
    }

    // ============================================================
    //                    CORE FUNCTIONS
    // ============================================================

    /**
     * @notice Submit a benefit claim
     * @param category The benefit category
     * @param amount The amount to claim
     * @param proofHash IPFS hash of supporting documents
     * @param description Description of the claim
     * @return claimId The ID of the created claim
     */
    function submitClaim(
        BenefitCategory category,
        uint256 amount,
        string calldata proofHash,
        string calldata description
    ) external whenNotPaused nonReentrant returns (uint256 claimId) {
        if (amount == 0) revert LakomiCare__ZeroAmount();

        BenefitType storage benefitType = benefitTypes[category];

        if (!benefitType.enabled) revert LakomiCare__BenefitDisabled();
        if (amount > benefitType.maxAmount) revert LakomiCare__ExceedsMaxAmount();
        if (amount > maxTotalPayout) revert LakomiCare__ExceedsMaxAmount();

        // Check member has contributed
        if (vault.getMemberBalance(msg.sender) == 0)
            revert LakomiCare__NotMember();

        // Check annual limit
        MemberUsage storage usage = memberUsage[msg.sender];
        _resetYearIfNeeded(usage);

        uint256 used = _getUsedAmount(usage, category);
        if (used + amount > benefitType.annualLimit)
            revert LakomiCare__ExceedsAnnualLimit();

        // Check cooling-off
        uint256 lastClaim = _getLastClaimTime(usage, category);
        if (lastClaim > 0 && block.timestamp < lastClaim + benefitType.coolingOffPeriod)
            revert LakomiCare__CoolingOffNotMet();

        claimId = claimCount++;

        claims[claimId] = Claim({
            id: claimId,
            claimant: msg.sender,
            category: category,
            amount: amount,
            proofHash: proofHash,
            description: description,
            timestamp: block.timestamp,
            status: ClaimStatus.Pending,
            rejectionReason: ""
        });

        emit ClaimSubmitted(claimId, msg.sender, category, amount, proofHash);

        // Auto-approve if no verification required
        if (!benefitType.verificationRequired) {
            _approveClaim(claimId);
        }
    }

    /**
     * @notice Approve a pending claim
     * @param claimId The ID of the claim
     */
    function approveClaim(uint256 claimId)
        external
        onlyRole(APPROVER_ROLE)
        nonReentrant
    {
        _approveClaim(claimId);
    }

    function _approveClaim(uint256 claimId) internal {
        Claim storage claim = claims[claimId];

        if (claim.claimant == address(0)) revert LakomiCare__ClaimNotFound();
        if (claim.status != ClaimStatus.Pending)
            revert LakomiCare__ClaimNotPending();

        claim.status = ClaimStatus.Approved;

        emit ClaimApproved(claimId, msg.sender);
    }

    /**
     * @notice Reject a pending claim
     * @param claimId The ID of the claim
     * @param reason The reason for rejection
     */
    function rejectClaim(uint256 claimId, string calldata reason)
        external
        onlyRole(APPROVER_ROLE)
        nonReentrant
    {
        Claim storage claim = claims[claimId];

        if (claim.claimant == address(0)) revert LakomiCare__ClaimNotFound();
        if (claim.status != ClaimStatus.Pending)
            revert LakomiCare__ClaimNotPending();

        claim.status = ClaimStatus.Rejected;
        claim.rejectionReason = reason;

        emit ClaimRejected(claimId, reason);
    }

    /**
     * @notice Process an approved claim (payout)
     * @param claimId The ID of the claim
     */
    function processClaim(uint256 claimId) external whenNotPaused nonReentrant {
        Claim storage claim = claims[claimId];

        if (claim.claimant == address(0)) revert LakomiCare__ClaimNotFound();
        if (claim.status != ClaimStatus.Approved)
            revert LakomiCare__AlreadyProcessed();

        // Update member usage
        MemberUsage storage usage = memberUsage[claim.claimant];
        _resetYearIfNeeded(usage);
        _updateUsage(usage, claim.category, claim.amount);

        claim.status = ClaimStatus.Paid;

        // Transfer funds from vault
        IERC20 stableToken = vault.stableToken();
        stableToken.safeTransfer(claim.claimant, claim.amount);

        emit ClaimPaid(claimId, claim.claimant, claim.amount);
    }

    // ============================================================
    //                    VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Check eligibility for a benefit
     * @param member The member address
     * @param category The benefit category
     * @return eligible Whether eligible
     * @return remaining The remaining claimable amount
     * @return cooldownRemaining The cooldown remaining in seconds
     */
    function checkEligibility(
        address member,
        BenefitCategory category
    )
        external
        view
        returns (
            bool eligible,
            uint256 remaining,
            uint256 cooldownRemaining
        )
    {
        BenefitType storage benefitType = benefitTypes[category];

        if (!benefitType.enabled) {
            return (false, 0, 0);
        }

        if (vault.getMemberBalance(member) == 0) {
            return (false, 0, 0);
        }

        MemberUsage storage usage = memberUsage[member];

        uint256 used = _getUsedAmount(usage, category);
        remaining = benefitType.annualLimit > used
            ? benefitType.annualLimit - used
            : 0;

        uint256 lastClaim = _getLastClaimTime(usage, category);

        // Only check cooldown if there was a previous claim
        if (lastClaim > 0) {
            uint256 cooldownEnd = lastClaim + benefitType.coolingOffPeriod;
            if (block.timestamp < cooldownEnd) {
                cooldownRemaining = cooldownEnd - block.timestamp;
                eligible = false;
                return (eligible, remaining, cooldownRemaining);
            }
        }

        cooldownRemaining = 0;
        eligible = remaining > 0;
    }

    /**
     * @notice Get member's claim history
     * @param member The member address
     * @return claimIds Array of claim IDs
     */
    function getMemberClaims(address member)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory tempClaims = new uint256[](claimCount);
        uint256 count = 0;

        for (uint256 i = 0; i < claimCount; i++) {
            if (claims[i].claimant == member) {
                tempClaims[count] = i;
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempClaims[i];
        }

        return result;
    }

    /**
     * @notice Get claim details
     * @param claimId The claim ID
     */
    function getClaim(uint256 claimId)
        external
        view
        returns (
            uint256 id,
            address claimant,
            BenefitCategory category,
            uint256 amount,
            string memory proofHash,
            string memory description,
            uint256 timestamp,
            ClaimStatus status,
            string memory rejectionReason
        )
    {
        Claim storage claim = claims[claimId];
        return (
            claim.id,
            claim.claimant,
            claim.category,
            claim.amount,
            claim.proofHash,
            claim.description,
            claim.timestamp,
            claim.status,
            claim.rejectionReason
        );
    }

    /**
     * @notice Get benefit type details
     * @param category The benefit category
     */
    function getBenefitType(BenefitCategory category)
        external
        view
        returns (
            string memory name,
            bool enabled,
            uint256 maxAmount,
            uint256 annualLimit,
            uint256 coolingOffPeriod,
            bool verificationRequired
        )
    {
        BenefitType storage bt = benefitTypes[category];
        return (
            bt.name,
            bt.enabled,
            bt.maxAmount,
            bt.annualLimit,
            bt.coolingOffPeriod,
            bt.verificationRequired
        );
    }

    // ============================================================
    //                    INTERNAL HELPERS
    // ============================================================

    function _resetYearIfNeeded(MemberUsage storage usage) internal {
        if (usage.lastYearReset == 0 ||
            block.timestamp >= usage.lastYearReset + 365 days) {
            usage.medicalUsed = 0;
            usage.unemploymentUsed = 0;
            usage.educationUsed = 0;
            usage.housingUsed = 0;
            usage.lastYearReset = block.timestamp;
        }
    }

    function _getUsedAmount(
        MemberUsage storage usage,
        BenefitCategory category
    ) internal view returns (uint256) {
        if (category == BenefitCategory.Medical) return usage.medicalUsed;
        if (category == BenefitCategory.Unemployment) return usage.unemploymentUsed;
        if (category == BenefitCategory.Education) return usage.educationUsed;
        if (category == BenefitCategory.Housing) return usage.housingUsed;
        return 0;
    }

    function _getLastClaimTime(
        MemberUsage storage usage,
        BenefitCategory category
    ) internal view returns (uint256) {
        if (category == BenefitCategory.Medical) return usage.medicalLastClaim;
        if (category == BenefitCategory.Unemployment) return usage.unemploymentLastClaim;
        if (category == BenefitCategory.Education) return usage.educationLastClaim;
        if (category == BenefitCategory.Housing) return usage.housingLastClaim;
        return 0;
    }

    function _updateUsage(
        MemberUsage storage usage,
        BenefitCategory category,
        uint256 amount
    ) internal {
        if (category == BenefitCategory.Medical) {
            usage.medicalUsed += amount;
            usage.medicalLastClaim = block.timestamp;
        } else if (category == BenefitCategory.Unemployment) {
            usage.unemploymentUsed += amount;
            usage.unemploymentLastClaim = block.timestamp;
        } else if (category == BenefitCategory.Education) {
            usage.educationUsed += amount;
            usage.educationLastClaim = block.timestamp;
        } else if (category == BenefitCategory.Housing) {
            usage.housingUsed += amount;
            usage.housingLastClaim = block.timestamp;
        }
    }

    // ============================================================
    //                  ADMIN FUNCTIONS
    // ============================================================

    /**
     * @notice Update benefit type settings
     * @param category The benefit category
     * @param enabled Whether enabled
     * @param maxAmount Maximum per claim
     * @param annualLimit Annual limit per member
     * @param coolingOffPeriod Cooling-off period
     * @param verificationRequired Whether verification needed
     */
    function updateBenefitType(
        BenefitCategory category,
        bool enabled,
        uint256 maxAmount,
        uint256 annualLimit,
        uint256 coolingOffPeriod,
        bool verificationRequired
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        benefitTypes[category] = BenefitType({
            name: benefitTypes[category].name,
            enabled: enabled,
            maxAmount: maxAmount,
            annualLimit: annualLimit,
            coolingOffPeriod: coolingOffPeriod,
            verificationRequired: verificationRequired
        });

        emit BenefitTypeUpdated(category, enabled);
        emit BenefitLimitsUpdated(category, maxAmount, annualLimit);
    }

    /**
     * @notice Set processing time
     * @param newTime The new time in seconds
     */
    function setProcessingTime(uint256 newTime)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        processingTime = newTime;
    }

    /**
     * @notice Set max total payout
     * @param newMax The new maximum
     */
    function setMaxTotalPayout(uint256 newMax)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        maxTotalPayout = newMax;
    }

    /**
     * @notice Pause benefit claims
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause benefit claims
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
