# WorkerUnionDAO - API Reference

## Contract Interface Documentation

**Version**: 1.0
**Solidity**: ^0.8.20
**License**: MIT

---

## Table of Contents

1. [UnionToken Interface](#uniontoken-interface)
2. [UnionVault Interface](#unionvault-interface)
3. [UnionDAO Interface](#uniondao-interface)
4. [LoanDesk Interface](#loandesk-interface)
5. [BenefitPayout Interface](#benefitpayout-interface)
6. [Error Reference](#error-reference)
7. [Event Reference](#event-reference)

---

## UnionToken Interface

### IUnionToken

```solidity
interface IUnionToken {
    // ===================================================================
    // ERC20 Standard (Inherited from OpenZeppelin)
    // ===================================================================

    /// @notice Gets the token name
    /// @return "Union Governance Token"
    function name() external view returns (string memory);

    /// @notice Gets the token symbol
    /// @return "UNT"
    function symbol() external view returns (string memory);

    /// @notice Gets the number of decimals
    /// @return 18
    function decimals() external view returns (uint8);

    /// @notice Gets the total token supply
    /// @return Total tokens in existence
    function totalSupply() external view returns (uint256);

    /// @notice Gets the balance of an account
    /// @param account The address to query
    /// @return The token balance
    function balanceOf(address account) external view returns (uint256);

    /// @notice Transfers tokens to another address
    /// @param to The recipient address
    /// @param amount The amount to transfer
    /// @return True if successful
    function transfer(address to, uint256 amount) external returns (bool);

    /// @notice Approves an address to spend tokens
    /// @param spender The address allowed to spend
    /// @param amount The amount allowed to spend
    /// @return True if successful
    function approve(address spender, uint256 amount) external returns (bool);

    /// ===================================================================
    // Union-Specific Functions
    // ===================================================================

    /// @notice Mints new governance tokens
    /// @dev Only callable by MINTER_ROLE
    /// @param to The recipient address
    /// @param amount The amount to mint
    function mint(address to, uint256 amount) external;

    /// @notice Burns tokens from an address
    /// @dev Only callable by BURNER_ROLE
    /// @param from The address to burn from
    /// @param amount The amount to burn
    function burn(address from, uint256 amount) external;

    /// @notice Locks tokens as collateral
    /// @dev Only callable by authorized contracts
    /// @param account The address to lock tokens from
    /// @param amount The amount to lock
    function lockTokens(address account, uint256 amount) external;

    /// @notice Unlocks previously locked tokens
    /// @dev Only callable by authorized contracts
    /// @param account The address to unlock tokens for
    /// @param amount The amount to unlock
    function unlockTokens(address account, uint256 amount) external;

    /// @notice Gets the amount of locked tokens for an account
    /// @param account The address to query
    /// @return The amount of locked tokens
    function getLockedBalance(address account) external view returns (uint256);

    /// @notice Gets the available (unlocked) balance for voting
    /// @param account The address to query
    /// @return The available balance
    function getAvailableBalance(address account) external view returns (uint256);

    /// @notice Enables or disables token transfers
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    /// @param enabled The new transfer state
    function setTransfersEnabled(bool enabled) external;

    /// @notice Sets the UnionVault contract address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    /// @param vault The vault address
    function setUnionVault(address vault) external;

    /// @notice Sets the UnionDAO contract address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    /// @param dao The DAO address
    function setUnionDAO(address dao) external;

    // ===================================================================
    // View Functions
    // ===================================================================

    /// @notice Gets the maximum token supply
    /// @return The maximum supply cap
    function maxSupply() external view returns (uint256);

    /// @notice Checks if transfers are enabled
    /// @return True if transfers are enabled
    function transfersEnabled() external view returns (bool);

    /// @notice Gets the UnionVault address
    /// @return The vault address
    function unionVault() external view returns (address);

    /// @notice Gets the UnionDAO address
    /// @return The DAO address
    function unionDAO() external view returns (address);
}
```

### Enums

```solidity
// No union-specific enums
```

### Structs

```solidity
// No additional structs beyond ERC20
```

---

## UnionVault Interface

### IUnionVault

```solidity
interface IUnionVault {
    // ===================================================================
    // Core Functions
    // ===================================================================

    /// @notice Deposits stablecoins into the vault
    /// @param amount The amount to deposit
    /// @return The member's new share balance
    function deposit(uint256 amount) external returns (uint256);

    /// @notice Withdraws stablecoins from the vault
    /// @param amount The amount to withdraw
    /// @return The actual amount withdrawn
    function withdraw(uint256 amount) external returns (uint256);

    /// @notice Requests a withdrawal above the threshold (requires DAO approval)
    /// @param recipient The address to receive funds
    /// @param amount The amount to withdraw
    /// @return The withdrawal ID
    function requestWithdrawal(address recipient, uint256 amount)
        external returns (uint256);

    /// @notice Executes an approved withdrawal after timelock
    /// @param withdrawalId The ID of the withdrawal to execute
    /// @return True if successful
    function executeWithdrawal(uint256 withdrawalId) external returns (bool);

    // ===================================================================
    // View Functions
    // ===================================================================

    /// @notice Gets a member's contribution balance
    /// @param member The member address
    /// @return The total contribution amount
    function getMemberBalance(address member) external view returns (uint256);

    /// @notice Gets a member's share of the vault
    /// @param member The member address
    /// @return The member's share amount
    function getMemberShare(address member) external view returns (uint256);

    /// @notice Gets the current vault balance
    /// @return The total stablecoins held
    function currentBalance() external view returns (uint256);

    /// @notice Gets a pending withdrawal details
    /// @param withdrawalId The withdrawal ID
    /// @return recipient The recipient address
    /// @return amount The withdrawal amount
    /// @return timestamp The request timestamp
    /// @return executableAt The timestamp when it can be executed
    /// @return executed Whether it has been executed
    function getPendingWithdrawal(uint256 withdrawalId)
        external view returns (
            address recipient,
            uint256 amount,
            uint256 timestamp,
            uint256 executableAt,
            bool executed
        );

    // ===================================================================
    // Emergency Functions
    // ===================================================================

    /// @notice Pauses all deposits and withdrawals
    /// @dev Only callable by PAUSER_ROLE
    function pause() external;

    /// @notice Unpauses the vault
    /// @dev Only callable by PAUSER_ROLE
    function unpause() external;

    /// @notice Emergency withdrawal of tokens (e.g., mistaken deposit)
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    /// @param token The token address to withdraw
    /// @param amount The amount to withdraw
    function emergencyWithdraw(address token, uint256 amount) external;

    // ===================================================================
    // Configuration Functions
    // ===================================================================

    /// @notice Sets the withdrawal threshold for auto-approval
    /// @param threshold The new threshold amount
    function setWithdrawalThreshold(uint256 threshold) external;

    /// @notice Sets the withdrawal timelock duration
    /// @param timelock The new timelock in seconds
    function setWithdrawalTimelock(uint256 timelock) external;

    // ===================================================================
    // Configuration View
    // ===================================================================

    /// @notice Gets the stable token address used by the vault
    /// @return The stable token contract address
    function stableToken() external view returns (address);

    /// @notice Gets the withdrawal threshold
    /// @return The threshold amount
    function withdrawalThreshold() external view returns (uint256);

    /// @notice Gets the withdrawal timelock duration
    /// @return The timelock in seconds
    function withdrawalTimelock() external view returns (uint256);

    /// @notice Checks if the vault is paused
    /// @return True if paused
    function paused() external view returns (bool);
}
```

### Structs

```solidity
struct PendingWithdrawal {
    address recipient;     // Address to receive funds
    uint256 amount;        // Amount to withdraw
    uint256 timestamp;     // When requested
    uint256 executableAt;  // When it can be executed
    bool executed;         // Whether executed
}
```

---

## UnionDAO Interface

### IUnionDAO

```solidity
interface IUnionDAO {
    // ===================================================================
    // Enums
    // ===================================================================

    enum ProposalType {
        SPEND,       // Transfer treasury funds
        PARAMETER,   // Change system parameters
        MEMBERSHIP,  // Add/remove members
        CUSTOM       // Other governance actions
    }

    enum ProposalState {
        Pending,     // Not yet active (optional: delay before voting)
        Active,      // Voting in progress
        Canceled,    // Canceled by proposer
        Defeated,    // Voted down
        Succeeded,   // Voted yes, waiting for timelock
        Queued,      // In timelock period
        Expired,     // Execution deadline passed
        Executed     // Successfully executed
    }

    enum Vote {
        Against,     // Vote against
        For,         // Vote for
        Abstain      // Abstain from voting
    }

    // ===================================================================
    // Core Functions
    // ===================================================================

    /// @notice Creates a new proposal
    /// @param description Human-readable description
    /// @param proposalType The type of proposal
    /// @param target Contract to call (for SPEND proposals)
    /// @param value ETH/value to send
    /// @param callData Encoded function call data
    /// @return The proposal ID
    function createProposal(
        string memory description,
        ProposalType proposalType,
        address target,
        uint256 value,
        bytes memory callData
    ) external returns (uint256);

    /// @notice Casts a vote on a proposal
    /// @param proposalId The ID of the proposal
    /// @param support True to vote for, false to vote against
    function vote(uint256 proposalId, bool support) external;

    /// @notice Casts a vote with a reason
    /// @param proposalId The ID of the proposal
    /// @param support True to vote for, false to vote against
    /// @param reason The reason for the vote
    function castVoteWithReason(
        uint256 proposalId,
        bool support,
        string memory reason
    ) external;

    /// @notice Casts a vote by signature (off-chain)
    /// @param proposalId The ID of the proposal
    /// @param support True to vote for, false to vote against
    /// @param v The v component of the signature
    /// @param r The r component of the signature
    /// @param s The s component of the signature
    function castVoteBySig(
        uint256 proposalId,
        bool support,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /// @notice Executes a successful proposal after timelock
    /// @param proposalId The ID of the proposal
    /// @return True if successful
    function executeProposal(uint256 proposalId) external returns (bool);

    /// @notice Cancels a proposal
    /// @dev Only proposer can cancel before voting starts
    /// @param proposalId The ID of the proposal
    function cancelProposal(uint256 proposalId) external;

    // ===================================================================
    // View Functions
    /// ===================================================================

    /// @notice Gets the details of a proposal
    /// @param proposalId The ID of the proposal
    /// @return id The proposal ID
    /// @return proposer The proposer's address
    /// @return description The proposal description
    /// @return proposalType The type of proposal
    /// @return target The target contract
    /// @return value The ETH/value to send
    /// @return forVotes Votes in favor
    /// @return againstVotes Votes against
    /// @return abstainVotes Abstentions
    /// @return startTime Voting start time
    /// @return endTime Voting end time
    /// @return executed Whether executed
    /// @return canceled Whether canceled
    function getProposal(uint256 proposalId)
        external view returns (
            uint256 id,
            address proposer,
            string memory description,
            ProposalType proposalType,
            address target,
            uint256 value,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 abstainVotes,
            uint256 startTime,
            uint256 endTime,
            bool executed,
            bool canceled
        );

    /// @notice Gets the current state of a proposal
    /// @param proposalId The ID of the proposal
    /// @return The current state
    function state(uint256 proposalId) external view returns (ProposalState);

    /// @notice Checks if an account has voted on a proposal
    /// @param proposalId The ID of the proposal
    /// @param account The account to check
    /// @return True if the account has voted
    function hasVoted(uint256 proposalId, address account)
        external view returns (bool);

    /// @notice Calculates the quorum required for a block
    /// @param blockNumber The block number
    /// @return The number of votes required
    function quorum(uint256 blockNumber) external view returns (uint256);

    /// @notice Gets an account's voting power at a timestamp
    /// @param account The account to check
    /// @param timestamp The timestamp to check at
    /// @return The voting power
    function getVotes(address account, uint256 timestamp)
        external view returns (uint256);

    // ===================================================================
    // Configuration Functions
    // ===================================================================

    /// @notice Sets the voting period duration
    /// @param newVotingPeriod The new duration in seconds
    function setVotingPeriod(uint256 newVotingPeriod) external;

    /// @notice Sets the quorum numerator
    /// @param newQuorumNumerator The new numerator
    function setQuorumNumerator(uint256 newQuorumNumerator) external;

    /// @notice Sets the execution timelock duration
    /// @param newExecutionTimelock The new duration in seconds
    function setExecutionTimelock(uint256 newExecutionTimelock) external;

    // ===================================================================
    // Configuration View
    // ===================================================================

    /// @notice Gets the governance token address
    /// @return The token address
    function governanceToken() external view returns (address);

    /// @notice Gets the voting period duration
    /// @return The duration in seconds
    function votingPeriod() external view returns (uint256);

    /// @notice Gets the quorum numerator
    /// @return The numerator
    function quorumNumerator() external view returns (uint256);

    /// @notice Gets the quorum denominator
    /// @return The denominator
    function quorumDenominator() external view returns (uint256);

    /// @notice Gets the execution timelock duration
    /// @return The duration in seconds
    function executionTimelock() external view returns (uint256);

    /// @notice Gets the total number of proposals
    /// @return The proposal count
    function proposalCount() external view returns (uint256);
}
```

### Structs

```solidity
struct Proposal {
    uint256 id;                   // Unique ID
    address proposer;             // Creator of proposal
    string description;           // Human-readable description
    ProposalType proposalType;    // Type of proposal
    bytes callData;               // Encoded function call
    address target;               // Contract to call
    uint256 value;                // ETH/value to send
    uint256 forVotes;             // Votes in favor
    uint256 againstVotes;         // Votes against
    uint256 abstainVotes;         // Abstentions
    uint256 startTime;            // Voting start time
    uint256 endTime;              // Voting end time
    bool executed;                // Whether executed
    bool canceled;                // Whether canceled
    mapping(address => bool) hasVoted;  // Vote tracking
}
```

---

## LoanDesk Interface

### ILoanDesk

```solidity
interface ILoanDesk {
    // ===================================================================
    // Enums
    // ===================================================================

    enum LoanStatus {
        REQUESTED,    // Loan requested, awaiting approval
        PENDING,      // Pending DAO approval (above threshold)
        ACTIVE,       // Loan active, awaiting repayment
        REPAID,       // Fully repaid
        DEFAULTED,    // Payment deadline missed
        CANCELED      // Loan canceled
    }

    // ===================================================================
    // Core Functions
    // ===================================================================

    /// @notice Requests a new loan
    /// @param amount The loan amount in stablecoins
    /// @param duration The loan duration in seconds
    /// @param reason The reason for the loan
    /// @return The loan ID
    function requestLoan(
        uint256 amount,
        uint256 duration,
        string memory reason
    ) external returns (uint256);

    /// @notice Approves a pending loan
    /// @dev Only callable by APPROVER_ROLE or DAO
    /// @param loanId The ID of the loan
    function approveLoan(uint256 loanId) external;

    /// @notice Disburses an approved loan
    /// @dev Locks collateral and transfers funds
    /// @param loanId The ID of the loan
    function disburseLoan(uint256 loanId) external;

    /// @notice Repays part or all of a loan
    /// @param loanId The ID of the loan
    /// @param amount The amount to repay
    function repayLoan(uint256 loanId, uint256 amount) external;

    /// @notice Repays the full loan amount
    /// @param loanId The ID of the loan
    function repayInFull(uint256 loanId) external;

    /// @notice Claims collateral from a defaulted loan
    /// @dev Only callable after loan is in DEFAULTED status
    /// @param loanId The ID of the loan
    function claimCollateral(uint256 loanId) external;

    // ===================================================================
    // View Functions
    // ===================================================================

    /// @notice Gets the details of a loan
    /// @param loanId The ID of the loan
    /// @return id The loan ID
    /// @return borrower The borrower's address
    /// @return principal The principal amount
    /// @return interest The interest amount
    /// @return collateralTokens The locked collateral tokens
    /// @return startTime The loan start time
    /// @return dueTime The payment deadline
    /// @return repaidAmount The amount repaid so far
    /// @return status The current status
    function getLoan(uint256 loanId)
        external view returns (
            uint256 id,
            address borrower,
            uint256 principal,
            uint256 interest,
            uint256 collateralTokens,
            uint256 startTime,
            uint256 dueTime,
            uint256 repaidAmount,
            LoanStatus status
        );

    /// @notice Gets all loans for a borrower
    /// @param borrower The borrower's address
    /// @return loanIds An array of loan IDs
    function getBorrowerLoans(address borrower)
        external view returns (uint256[] memory loanIds);

    /// @notice Calculates the interest for a loan
    /// @param principal The principal amount
    /// @param duration The loan duration in seconds
    /// @return The interest amount
    function calculateInterest(uint256 principal, uint256 duration)
        external view returns (uint256);

    /// @notice Gets the maximum loan amount for a borrower
    /// @param borrower The borrower's address
    /// @return The maximum loan amount
    function getMaxLoanAmount(address borrower)
        external view returns (uint256);

    /// @notice Gets the required collateral for a loan amount
    /// @param amount The loan amount
    /// @return The required collateral tokens
    function getRequiredCollateral(uint256 amount)
        external view returns (uint256);

    // ===================================================================
    // Configuration Functions
    // ===================================================================

    /// @notice Sets the interest rate (in basis points)
    /// @param newRate The new rate (100 = 1%)
    function setInterestRate(uint256 newRate) external;

    /// @notice Sets the max loan-to-contribution ratio (in basis points)
    /// @param newRatio The new ratio (5000 = 50%)
    function setMaxLoanToContribution(uint256 newRatio) external;

    /// @notice Sets the collateral requirement (in basis points)
    /// @param newRequirement The new requirement (2500 = 25%)
    function setCollateralRequirement(uint256 newRequirement) external;

    /// @notice Sets the auto-approval threshold
    /// @param newThreshold The new threshold
    function setAutoApprovalThreshold(uint256 newThreshold) external;

    /// @notice Sets the loan duration
    /// @param newDuration The new duration in seconds
    function setLoanDuration(uint256 newDuration) external;

    // ===================================================================
    // Configuration View
    // ===================================================================

    /// @notice Gets the interest rate
    /// @return The rate in basis points
    function interestRate() external view returns (uint256);

    /// @notice Gets the max loan-to-contribution ratio
    /// @return The ratio in basis points
    function maxLoanToContribution() external view returns (uint256);

    /// @notice Gets the collateral requirement
    /// @return The requirement in basis points
    function collateralRequirement() external view returns (uint256);

    /// @notice Gets the auto-approval threshold
    /// @return The threshold amount
    function autoApprovalThreshold() external view returns (uint256);

    /// @notice Gets the default loan duration
    /// @return The duration in seconds
    function loanDuration() external view returns (uint256);

    /// @notice Gets the total number of loans
    /// @return The loan count
    function totalLoans() external view returns (uint256);

    /// @notice Gets the number of active loans
    /// @return The active loan count
    function activeLoans() external view returns (uint256);
}
```

### Structs

```solidity
struct Loan {
    uint256 id;                // Unique ID
    address borrower;          // Borrower's address
    uint256 principal;         // Principal amount
    uint256 interest;          // Interest amount
    uint256 collateralTokens;  // Locked governance tokens
    uint256 startTime;         // Loan start timestamp
    uint256 dueTime;           // Payment deadline
    uint256 repaidAmount;      // Amount repaid so far
    LoanStatus status;         // Current status
}
```

---

## BenefitPayout Interface

### IBenefitPayout

```solidity
interface IBenefitPayout {
    // ===================================================================
    // Enums
    // ===================================================================

    enum ClaimStatus {
        PENDING,    // Claim submitted, awaiting review
        APPROVED,   // Claim approved, awaiting payout
        REJECTED,   // Claim rejected
        PAID        // Benefit paid out
    }

    // ===================================================================
    // Core Functions
    // ===================================================================

    /// @notice Claims a benefit
    /// @param benefitType The type of benefit (keccak256 hash)
    /// @param amount The amount to claim
    /// @param proof Reference to verification documents (IPFS hash, etc.)
    /// @return The claim ID
    function claimBenefit(
        bytes32 benefitType,
        uint256 amount,
        string memory proof
    ) external returns (uint256);

    /// @notice Approves a pending claim
    /// @dev Only callable by APPROVER_ROLE or DAO
    /// @param claimId The ID of the claim
    function approveClaim(uint256 claimId) external;

    /// @notice Rejects a pending claim
    /// @dev Only callable by APPROVER_ROLE or DAO
    /// @param claimId The ID of the claim
    /// @param reason The reason for rejection
    function rejectClaim(uint256 claimId, string memory reason) external;

    /// @notice Processes an approved claim (transfers funds)
    /// @param claimId The ID of the claim
    function processClaim(uint256 claimId) external;

    // ===================================================================
    // View Functions
    // ===================================================================

    /// @notice Gets the details of a claim
    /// @param claimId The ID of the claim
    /// @return id The claim ID
    /// @return claimant The claimant's address
    /// @return benefitType The type of benefit
    /// @return amount The claimed amount
    /// @return proof Reference to verification
    /// @return timestamp Submission time
    /// @return status The current status
    /// @return rejectionReason Reason if rejected
    function getClaim(uint256 claimId)
        external view returns (
            uint256 id,
            address claimant,
            bytes32 benefitType,
            uint256 amount,
            string memory proof,
            uint256 timestamp,
            ClaimStatus status,
            string memory rejectionReason
        );

    /// @notice Gets a member's claimable amount for a benefit type
    /// @param member The member's address
    /// @param benefitType The type of benefit
    /// @return The remaining claimable amount
    function getMemberClaimable(address member, bytes32 benefitType)
        external view returns (uint256);

    /// @notice Gets a member's claim history
    /// @param member The member's address
    /// @return claimIds An array of claim IDs
    function getMemberClaimHistory(address member)
        external view returns (uint256[] memory claimIds);

    /// @notice Gets the details of a benefit type
    /// @param benefitType The type of benefit
    /// @return name The benefit name
    /// @return enabled Whether enabled
    /// @return maxAmount Maximum per claim
    /// @return annualLimit Annual limit per member
    /// @return coolingOffPeriod Cooling-off period in seconds
    /// @return verificationRequired Whether verification is required
    function getBenefitType(bytes32 benefitType)
        external view returns (
            string memory name,
            bool enabled,
            uint256 maxAmount,
            uint256 annualLimit,
            uint256 coolingOffPeriod,
            bool verificationRequired
        );

    // ===================================================================
    // Configuration Functions
    // ===================================================================

    /// @notice Adds a new benefit type
    /// @param key The benefit type key (keccak256 hash)
    /// @param name The benefit name
    /// @param maxAmount Maximum per claim
    /// @param annualLimit Annual limit per member
    /// @param coolingOffPeriod Cooling-off period in seconds
    /// @param verificationRequired Whether verification is required
    function addBenefitType(
        bytes32 key,
        string memory name,
        uint256 maxAmount,
        uint256 annualLimit,
        uint256 coolingOffPeriod,
        bool verificationRequired
    ) external;

    /// @notice Updates a benefit type's enabled status
    /// @param key The benefit type key
    /// @param enabled The new enabled status
    function updateBenefitType(bytes32 key, bool enabled) external;

    /// @notice Sets the auto-approve processing time
    /// @param newTime The new time in seconds
    function setProcessingTime(uint256 newTime) external;

    /// @notice Sets the maximum total payout per claim
    /// @param newMax The new maximum
    function setMaxTotalPayout(uint256 newMax) external;

    // ===================================================================
    // Configuration View
    // ===================================================================

    /// @notice Gets the processing time for auto-approval
    /// @return The time in seconds
    function processingTime() external view returns (uint256);

    /// @notice Gets the maximum total payout per claim
    /// @return The maximum amount
    function maxTotalPayout() external view returns (uint256);

    /// @notice Gets all benefit type keys
    /// @return An array of benefit type keys
    function getAllBenefitTypes() external view returns (bytes32[] memory);

    /// @notice Gets the total number of claims
    /// @return The claim count
    function totalClaims() external view returns (uint256);
}
```

### Structs

```solidity
struct BenefitType {
    string name;                  // Human-readable name
    bool enabled;                 // Whether currently available
    uint256 maxAmount;            // Maximum per claim
    uint256 annualLimit;          // Annual limit per member
    uint256 coolingOffPeriod;     // Seconds between claims
    bool verificationRequired;    // Whether manual verification needed
}

struct MemberLimits {
    mapping(bytes32 => uint256) claimedThisYear;  // Per benefit type
    mapping(bytes32 => uint256) lastClaimTime;    // For cooling-off
    uint256 lastYearUpdate;                        // Last year update time
}

struct Claim {
    uint256 id;               // Unique ID
    address claimant;         // Claimant's address
    bytes32 benefitType;      // Type of benefit
    uint256 amount;           // Claimed amount
    string proofReference;    // Reference to verification docs
    uint256 timestamp;        // Submission time
    ClaimStatus status;       // Current status
    string rejectionReason;   // Reason if rejected
}
```

---

## Error Reference

### UnionToken Errors

| Error | Description |
|-------|-------------|
| `UnionToken__ZeroAddress()` | Address parameter is zero |
| `UnionToken__InsufficientBalance()` | Insufficient token balance |
| `UnionToken__ExceedsMaxSupply()` | Minting would exceed max supply |
| `UnionToken__TransfersDisabled()` | Token transfers are currently disabled |
| `UnionToken__InsufficientUnlockedTokens()` | Not enough unlocked tokens |
| `UnionToken__NothingToUnlock()` | No tokens to unlock |

### UnionVault Errors

| Error | Description |
|-------|-------------|
| `UnionVault__ZeroAmount()` | Amount parameter is zero |
| `UnionVault__InsufficientBalance()` | Insufficient vault balance |
| `UnionVault__ExceedsWithdrawalThreshold()` | Withdrawal exceeds threshold |
| `UnionVault__TimelockNotMet()` | Withdrawal timelock not yet met |
| `UnionVault__AlreadyExecuted()` | Withdrawal already executed |
| `UnionVault__Paused()` | Contract is paused |
| `UnionVault__InvalidToken()` | Invalid token address |

### UnionDAO Errors

| Error | Description |
|-------|-------------|
| `UnionDAO__EmptyDescription()` | Proposal description is empty |
| `UnionDAO__InvalidProposalType()` | Invalid proposal type |
| `UnionDAO__ProposalNotActive()` | Proposal is not active |
| `UnionDAO__AlreadyVoted()` | Account has already voted |
| `UnionDAO__ProposalNotSucceeded()` | Proposal has not succeeded |
| `UnionDAO__TimelockNotMet()` | Execution timelock not yet met |
| `UnionDAO__QuorumNotMet()` | Minimum participation not reached |
| `UnionDAO__OnlyProposer()` | Only proposer can cancel |

### LoanDesk Errors

| Error | Description |
|-------|-------------|
| `LoanDesk__InvalidAmount()` | Invalid loan amount |
| `LoanDesk__ExceedsMaxLoan()` | Amount exceeds maximum |
| `LoanDesk__InsufficientCollateral()` | Not enough collateral tokens |
| `LoanDesk__LoanNotActive()` | Loan is not in active status |
| `LoanDesk__Overpayment()` | Repayment exceeds owed amount |
| `LoanDesk__NotDefaulted()` | Loan has not defaulted |
| `LoanDesk__AlreadyRepaid()` | Loan already repaid |
| `LoanDesk__InsufficientContribution()` | Member hasn't contributed enough |

### BenefitPayout Errors

| Error | Description |
|-------|-------------|
| `BenefitPayout__InvalidBenefitType()` | Benefit type does not exist |
| `BenefitPayout__BenefitDisabled()` | Benefit type is disabled |
| `ExceedsMaxAmount()` | Amount exceeds per-claim maximum |
| `ExceedsAnnualLimit()` | Amount exceeds annual limit |
| `CoolingOffNotMet()` | Cooling-off period not met |
| `ClaimNotPending()` | Claim is not in pending status |
| `AlreadyProcessed()` | Claim already processed |

---

## Event Reference

### UnionToken Events

| Event | Parameters | Description |
|-------|-----------|-------------|
| `TokensMinted` | `address indexed to`, `uint256 amount`, `uint256 timestamp` | Tokens minted to address |
| `TokensBurned` | `address indexed from`, `uint256 amount`, `uint256 timestamp` | Tokens burned from address |
| `TokensLocked` | `address indexed account`, `uint256 amount`, `uint256 timestamp` | Tokens locked as collateral |
| `TokensUnlocked` | `address indexed account`, `uint256 amount`, `uint256 timestamp` | Tokens unlocked |
| `TransfersToggled` | `bool enabled`, `address indexed by` | Transfer status changed |

### UnionVault Events

| Event | Parameters | Description |
|-------|-----------|-------------|
| `Deposited` | `address indexed member`, `uint256 amount`, `uint256 timestamp` | Member deposited funds |
| `Withdrawn` | `address indexed member`, `uint256 amount`, `uint256 timestamp` | Member withdrew funds |
| `WithdrawalRequested` | `uint256 indexed id`, `address recipient`, `uint256 amount`, `uint256 executableAt` | Large withdrawal requested |
| `WithdrawalExecuted` | `uint256 indexed id`, `address recipient`, `uint256 amount`, `uint256 timestamp` | Withdrawal executed |
| `Paused` | `address indexed by` | Contract paused |
| `Unpaused` | `address indexed by` | Contract unpaused |

### UnionDAO Events

| Event | Parameters | Description |
|-------|-----------|-------------|
| `ProposalCreated` | `uint256 indexed id`, `address indexed proposer`, `string description`, `ProposalType proposalType`, `uint256 startTime`, `uint256 endTime` | New proposal created |
| `VoteCast` | `uint256 indexed proposalId`, `address indexed voter`, `bool support`, `uint256 weight`, `string reason` | Vote cast |
| `ProposalExecuted` | `uint256 indexed id`, `uint256 timestamp` | Proposal executed |
| `ProposalCanceled` | `uint256 indexed id`, `address indexed by` | Proposal canceled |
| `QuorumNumeratorUpdated` | `uint256 oldQuorumNumerator`, `uint256 newQuorumNumerator` | Quorum requirement changed |
| `VotingPeriodUpdated` | `uint256 oldVotingPeriod`, `uint256 newVotingPeriod` | Voting period changed |

### LoanDesk Events

| Event | Parameters | Description |
|-------|-----------|-------------|
| `LoanRequested` | `uint256 indexed id`, `address indexed borrower`, `uint256 amount`, `uint256 duration`, `string reason` | Loan requested |
| `LoanApproved` | `uint256 indexed id`, `uint256 collateralRequired` | Loan approved |
| `LoanDisbursed` | `uint256 indexed id`, `address indexed borrower`, `uint256 amount` | Loan disbursed |
| `LoanRepaid` | `uint256 indexed id`, `address indexed borrower`, `uint256 amount`, `uint256 remaining` | Loan repayment made |
| `LoanDefaulted` | `uint256 indexed id`, `address indexed borrower`, `uint256 collateralClaimed` | Loan defaulted |
| `InterestRateUpdated` | `uint256 oldRate`, `uint256 newRate` | Interest rate changed |

### BenefitPayout Events

| Event | Parameters | Description |
|-------|-----------|-------------|
| `ClaimCreated` | `uint256 indexed id`, `address indexed claimant`, `bytes32 indexed benefitType`, `uint256 amount`, `string proofReference` | Claim submitted |
| `ClaimApproved` | `uint256 indexed id`, `address indexed approver` | Claim approved |
| `ClaimRejected` | `uint256 indexed id`, `string reason` | Claim rejected |
| `ClaimPaid` | `uint256 indexed id`, `address indexed claimant`, `uint256 amount` | Benefit paid |
| `BenefitTypeAdded` | `bytes32 indexed key`, `string name`, `uint256 maxAmount`, `uint256 annualLimit` | Benefit type added |
| `BenefitTypeUpdated` | `bytes32 indexed key`, `bool enabled` | Benefit type updated |

---

## Type Definitions

### Common Types

```solidity
// Address for tokens, contracts, or members
type Address is address;

// Token amounts (using 18 decimals)
type Amount is uint256;

// Timestamp in seconds since epoch
type Timestamp is uint256;

// Duration in seconds
type Duration is uint256;

// Basis points (1 bp = 0.01%, 10000 bp = 100%)
type BasisPoints is uint256;

// Proposal and Loan IDs
type Id is uint256;

// Boolean flags
type Flag is bool;
```

---

## Usage Examples

### Creating a Proposal

```solidity
// 1. Approve tokens (if membership fee required)
IUnionToken(token).approve(dao, membershipFee);

// 2. Create proposal
uint256 proposalId = IUnionDAO(dao).createProposal(
    "Fund community kitchen project",      // description
    IUnionDAO.ProposalType.SPEND,          // proposalType
    vaultAddress,                          // target (UnionVault)
    0,                                     // value (no ETH)
    abi.encodeWithSignature(               // callData
        "requestWithdrawal(address,uint256)",
        communityKitchenAddress,
        5000 * 1e6  // 5000 USDC (6 decimals)
    )
);
```

### Requesting a Loan

```solidity
// 1. Calculate interest
uint256 principal = 500 * 1e6;  // 500 USDC
uint256 duration = 30 days;
(uint256 interest) = ILoanDesk(loanDesk).calculateInterest(principal, duration);

// 2. Request loan
uint256 loanId = ILoanDesk(loanDesk).requestLoan(
    principal,           // 500 USDC
    duration,            // 30 days
    "Emergency car repair"
);

// 3. Wait for approval, then receive funds
// Loan will be automatically disbursed if under threshold
```

### Claiming a Benefit

```solidity
// 1. Claim benefit
bytes32 benefitType = keccak256("MEDICAL");
string memory proofReference = "ipfs://Qm...";  // Document hash

uint256 claimId = IBenefitPayout(benefitPayout).claimBenefit(
    benefitType,
    2000 * 1e6,  // 2000 USDC
    proofReference
);

// 2. Wait for approval and payout
// Or check status: getClaim(claimId)
```

---

*API Reference v1.0 - WorkerUnionDAO*
