# WorkerUnionDAO - Visual Diagrams

## Complete Visual Documentation

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Contract Architecture](#contract-architecture)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [State Machines](#state-machines)
5. [Sequence Diagrams](#sequence-diagrams)
6. [Entity Relationships](#entity-relationships)
7. [Network Topology](#network-topology)

---

## System Overview

### Main System Diagram

```mermaid
graph TB
    subgraph "User Layer"
        U1[Workers/Members]
        U2[Administrators]
        U3[External Services]
    end

    subgraph "Application Layer"
        A1[Web Dashboard]
        A2[Mobile App<br/>Future]
        A3[Admin Portal]
    end

    subgraph "Blockchain Layer - Ethereum"
        direction TB

        subgraph "Core Contracts"
            T[UnionToken<br/>🪙 ERC-20]
            V[UnionVault<br/>💰 Treasury]
            D[UnionDAO<br/>🗳️ Governance]
        end

        subgraph "Service Contracts"
            L[LoanDesk<br/>🏦 Loans]
            B[BenefitPayout<br/>🎁 Benefits]
            P[ProposalSystem<br/>📋 Proposals]
        end
    end

    subgraph "Infrastructure"
        I1[The Graph<br/>Indexing]
        I2[IPFS<br/>Storage]
        I3[Etherscan<br/>Explorer]
    end

    U1 -->|Connect| A1
    U2 -->|Manage| A3
    U3 -->|Integrate| A1

    A1 -->|Read/Write| T
    A1 -->|Read/Write| V
    A1 -->|Read/Write| D
    A1 -->|Read/Write| L
    A1 -->|Read/Write| B

    A3 -->|Configure| D
    A3 -->|Override| V

    T -.->|Voting Power| D
    T -.->|Collateral| L
    V -.->|Funds| L
    V -.->|Payouts| B
    D -.->|Control| V
    D -.->|Params| L
    D -.->|Params| B

    D -->|Events| I1
    V -->|Events| I1
    L -->|Events| I1

    A1 -->|Store Docs| I2
    U1 -->|Verify| I3

    style T fill:#c8e6c9
    style V fill:#ffcc80
    style D fill:#ce93d8
    style L fill:#f48fb1
    style B fill:#f48fb1
```

---

## Contract Architecture

### Contract Hierarchy

```mermaid
graph TB
    subgraph "Inheritance Hierarchy"
        direction TB

        subgraph "OpenZeppelin Base"
            OZ1[IERC20]
            OZ2[ERC20]
            OZ3[AccessControl]
            OZ4[ReentrancyGuard]
            OZ5[Pausable]
            OZ6[IERC20Metadata]
        end

        subgraph "WorkerUnionDAO Contracts"
            TOKEN[UnionToken]
            VAULT[UnionVault]
            DAO[UnionDAO]
            LOAN[LoanDesk]
            BENEFIT[BenefitPayout]
        end
    end

    OZ1 --> OZ2
    OZ6 --> OZ2
    OZ2 --> TOKEN
    OZ3 --> TOKEN

    OZ3 --> VAULT
    OZ4 --> VAULT
    OZ5 --> VAULT

    OZ3 --> DAO
    OZ4 --> DAO
    OZ5 --> DAO

    OZ3 --> LOAN
    OZ4 --> LOAN

    OZ3 --> BENEFIT
    OZ4 --> BENEFIT

    style TOKEN fill:#c8e6c9
    style VAULT fill:#ffcc80
    style DAO fill:#ce93d8
    style LOAN fill:#f48fb1
    style BENEFIT fill:#f48fb1
```

### Contract Interactions

```mermaid
graph LR
    subgraph "Contract Interaction Graph"
        direction LR

        TOKEN[UnionToken]
        VAULT[UnionVault]
        DAO[UnionDAO]
        LOAN[LoanDesk]
        BENEFIT[BenefitPayout]
        MEMBER[Member]
    end

    MEMBER -->|Hold| TOKEN
    MEMBER -->|Deposit| VAULT
    MEMBER -->|Propose| DAO
    MEMBER -->|Borrow| LOAN
    MEMBER -->|Claim| BENEFIT

    TOKEN -->|Voting Weight| DAO
    TOKEN -->|Collateral| LOAN

    VAULT -->|Disburse| LOAN
    VAULT -->|Pay| BENEFIT
    VAULT -->|Spend| DAO

    DAO -->|Authorize| VAULT
    DAO -->|Set Rate| LOAN
    DAO -->|Set Limits| BENEFIT
    DAO -->|Mint/Burn| TOKEN

    style TOKEN fill:#c8e6c9
    style VAULT fill:#ffcc80
    style DAO fill:#ce93d8
    style LOAN fill:#f48fb1
    style BENEFIT fill:#f48fb1
    style MEMBER fill:#e1f5fe
```

---

## Data Flow Diagrams

### Member Onboarding Flow

```mermaid
flowchart TD
    A[Worker] -->|1. Register| B[Frontend]
    B -->|2. Submit KYC| C{KYC Provider}
    C -->|3. Verify| D{Approved?}
    D -->|Yes| E[UnionToken.sol]
    D -->|No| F[Reject]
    E -->|4. Mint Tokens| G[Member]
    G -->|5. Deposit| H[UnionVault.sol]
    H -->|6. Issue Shares| I[Member Dashboard]
    I -->|7. Welcome| J[Member]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style H fill:#ffcc80
    style I fill:#e3f2fd
```

### Proposal Creation & Voting Flow

```mermaid
flowchart TD
    A[Member] -->|1. Create| B[UnionDAO.sol]
    B -->|2. Validate| C{Valid?}
    C -->|No| D[Reject]
    C -->|Yes| E[Store Proposal]
    E -->|3. Emit Event| F[All Members]
    F -->|4. Vote| G[UnionDAO.sol]
    G -->|5. Record Vote| H[Proposal State]
    H -->|6. Check Quorum| I{Quorum Met?}
    I -->|No| J[Continue Voting]
    I -->|Yes| K{Passed?}
    K -->|No| L[Defeated]
    K -->|Yes| M[Queue]
    M -->|7. Timelock| N[Execute]
    N -->|8. Call Target| O[UnionVault.sol]
    O -->|9. Transfer| P[Recipient]

    style A fill:#e1f5fe
    style B fill:#ce93d8
    style O fill:#ffcc80
```

### Loan Request Flow

```mermaid
flowchart TD
    A[Member] -->|1. Request| B[LoanDesk.sol]
    B -->|2. Check Eligibility| C{Eligible?}
    C -->|No| D[Reject]
    C -->|Yes| E{Auto-approve?}
    E -->|Yes| F[Lock Collateral]
    E -->|No| G[Queue for DAO]
    G -->|3. DAO Vote| H{Approved?}
    H -->|No| I[Reject]
    H -->|Yes| F
    F -->|4. Disburse| J[UnionVault.sol]
    J -->|5. Transfer| K[Member]
    K -->|6. Repay| L[LoanDesk.sol]
    L -->|7. Return Funds| M[UnionVault.sol]
    M -->|8. Unlock| N[UnionToken.sol]

    style A fill:#e1f5fe
    style B fill:#f48fb1
    style J fill:#ffcc80
    style N fill:#c8e6c9
```

### Benefit Claim Flow

```mermaid
flowchart TD
    A[Member] -->|1. Claim| B[BenefitPayout.sol]
    B -->|2. Validate| C{Eligible?}
    C -->|No| D[Reject]
    C -->|Yes| E{Auto-approve?}
    E -->|Yes| F[Approve]
    E -->|No| G[Pending Review]
    G -->|3. Manual Review| H{Approved?}
    H -->|No| I[Reject]
    H -->|Yes| F
    F -->|4. Request Payout| J[UnionVault.sol]
    J -->|5. Transfer| K[Member]
    K -->|6. Update Limits| L[BenefitPayout.sol]

    style A fill:#e1f5fe
    style B fill:#f48fb1
    style J fill:#ffcc80
```

---

## State Machines

### Proposal State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft: Member Creates
    Draft --> Pending: Submit to DAO
    Pending --> Active: Voting Starts

    Active --> Active: Votes Cast
    Active --> Canceled: Proposer Cancels
    Active --> Defeated: Voting Ends<br/>For ≤ Against
    Active --> Defeated: Voting Ends<br/>Quorum Not Met
    Active --> Succeeded: Voting Ends<br/>For > Against<br/>Quorum Met

    Succeeded --> Queued: Timelock Starts
    Queued --> Expired: Deadline Passes
    Queued --> Executed: Execute Called
    Queued --> Canceled: Emergency Cancel

    Executed --> [*]
    Canceled --> [*]
    Defeated --> [*]
    Expired --> [*]

    note right of Active
        Voting Period:
        - Members can vote
        - Vote weight = tokens
        - Can change vote
    end note

    note right of Queued
        Timelock Period:
        - Safety delay
        - Can be canceled
        - Review period
    end note
```

### Loan State Machine

```mermaid
stateDiagram-v2
    [*] --> Requested: Member Requests
    Requested --> Pending: Awaiting Review

    Pending --> Approved: Under Threshold<br/>or DAO Approves
    Pending --> Rejected: DAO Rejects

    Approved --> Active: Disbursed<br/>Collateral Locked

    Active --> Active: Partial Repayment
    Active --> Repaid: Full Repayment
    Active --> Defaulted: Deadline Missed

    Repaid --> [*]: Collateral Returned
    Defaulted --> Liquidated: Collateral Claimed
    Rejected --> [*]
    Liquidated --> [*]

    note right of Active
        During Loan Term:
        - Can repay anytime
        - Collateral locked
        - Interest accrues
    end note

    note right of Defaulted
        After Default:
        - Grace period (optional)
        - Collateral can be claimed
        - Member loses tokens
    end note
```

### Benefit Claim State Machine

```mermaid
stateDiagram-v2
    [*] --> Submitted: Member Claims
    Submitted --> Pending: Awaiting Review

    Pending --> Approved: Auto-approve<br/>or Manual Approve
    Pending --> Rejected: Manual Reject

    Approved --> Processing: Fund Transfer Initiated
    Processing --> Paid: Transfer Complete

    Paid --> [*]
    Rejected --> [*]

    note right of Pending
        Review Checks:
        - Eligibility
        - Limits
        - Cooling-off period
        - Documentation
    end note

    note right of Approved
        Before Payout:
        - Freeze claim amount
        - Update member limits
        - Queue transfer
    end note
```

### Member State Machine

```mermaid
stateDiagram-v2
    [*] --> NonMember: Not Registered
    NonMember --> Pending: Submits Application
    Pending --> Member: KYC Approved
    Pending --> NonMember: KYC Rejected

    Member --> Member: Normal Activity
    Member --> Warning: Missed Payment<br/>or Violation
    Warning --> Member: Resolved
    Warning --> Suspended: Not Resolved

    Member --> FormerMember: Voluntary Exit
    Suspended --> FormerMember: Forced Exit
    FormerMember --> [*]

    note right of Member
        Can:
        - Vote
        - Propose
        - Borrow
        - Claim benefits
    end note

    note right of Warning
        Restricted:
        - Cannot borrow
        - Reduced benefits
    end note
```

---

## Sequence Diagrams

### Complete Member Onboarding

```mermaid
sequenceDiagram
    autonumber
    participant W as Worker
    participant F as Frontend
    participant K as KYC Provider
    participant T as UnionToken
    participant V as UnionVault
    participant D as Database

    W->>F: 1. Click "Join Union"
    F->>W: 2. Show Registration Form
    W->>F: 3. Submit Personal Info

    F->>K: 4. Request Verification
    K->>K: 5. Process Verification
    K->>F: 6. Return Result

    alt Approved
        F->>T: 7. Mint Tokens (100 UNT)
        T->>F: 8. Confirm Minting
        T->>D: 9. Record Issuance

        F->>W: 10. Request Initial Deposit
        W->>V: 11. Deposit USDC (e.g., 500)
        V->>V: 12. Calculate Shares
        V->>D: 13. Record Contribution

        F->>W: 14. Show Welcome Dashboard
    else Rejected
        F->>W: 15. Show Rejection
    end
```

### Proposal Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant P as Proposer
    participant DAO as UnionDAO
    participant All as Members
    participant V as UnionVault
    participant R as Recipient

    P->>DAO: 1. Create Proposal
    DAO->>DAO: 2. Validate & Store
    DAO->>All: 3. Emit ProposalCreated

    Note over All: Voting Period (7 days)

    loop For Each Member
        All->>DAO: 4. Cast Vote (For/Against)
        DAO->>DAO: 5. Record Vote Weight
    end

    Note over DAO: Voting Period Ends

    DAO->>DAO: 6. Tally Votes
    DAO->>DAO: 7. Check Quorum

    alt Passed
        DAO->>DAO: 8. Mark Succeeded
        DAO->>All: 9. Emit ProposalSucceeded

        Note over DAO: Timelock Period (48 hours)

        P->>DAO: 10. Execute Proposal
        DAO->>V: 11. Call Target Contract
        V->>V: 12. Transfer Funds
        V->>R: 13. Send USDC
        V->>DAO: 14. Confirm Execution
        DAO->>All: 15. Emit ProposalExecuted
    else Failed
        DAO->>All: 16. Emit ProposalDefeated
    end
```

### Loan Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant B as Borrower
    participant L as LoanDesk
    participant T as UnionToken
    participant V as UnionVault
    participant D as DAO (optional)

    B->>L: 1. Request Loan (amount, duration)
    L->>L: 2. Check Eligibility
    L->>L: 3. Check Max LTV

    alt Under Threshold
        L->>L: 4. Auto-approve
    else Over Threshold
        L->>D: 5. Request DAO Approval
        D->>L: 6. Return Approval Decision
    end

    alt Approved
        L->>T: 7. Lock Collateral Tokens
        T->>L: 8. Confirm Locked
        L->>V: 9. Request Loan Disbursement
        V->>B: 10. Transfer USDC
        L->>B: 11. Confirm Loan Active

        Note over B: Repayment Period

        B->>L: 12. Repay (principal + interest)
        L->>V: 13. Return Funds
        V->>L: 14. Confirm Receipt
        L->>T: 15. Unlock Collateral
        T->>B: 16. Return Tokens
    else Rejected
        L->>B: 17. Notify Rejection
    end
```

### Benefit Claim Processing

```mermaid
sequenceDiagram
    autonumber
    participant M as Member
    participant BP as BenefitPayout
    participant V as UnionVault
    participant A as Admin (optional)

    M->>BP: 1. Submit Claim (type, amount, proof)
    BP->>BP: 2. Validate Eligibility
    BP->>BP: 3. Check Limits
    BP->>BP: 4. Check Cooling-off

    alt Auto-approve Eligible
        BP->>BP: 5. Mark Approved
    else Manual Review Required
        BP->>BP: 6. Mark Pending
        BP->>A: 7. Notify for Review
        A->>BP: 8. Approve or Reject
    end

    alt Approved
        BP->>V: 9. Request Payout
        V->>M: 10. Transfer USDC
        V->>BP: 11. Confirm Transfer
        BP->>BP: 12. Update Member Limits
        BP->>M: 13. Notify Success
    else Rejected
        BP->>M: 14. Notify Rejection with Reason
    end
```

---

## Entity Relationships

### Entity Relationship Diagram

```mermaid
erDiagram
    MEMBER ||--o{ TOKEN_HOLDING : holds
    MEMBER ||--o{ VAULT_CONTRIBUTION : contributes
    MEMBER ||--o{ PROPOSAL : creates
    MEMBER ||--o{ VOTE : casts
    MEMBER ||--o{ LOAN : borrows
    MEMBER ||--o{ CLAIM : submits

    TOKEN ||--o{ TOKEN_HOLDING : tracks
    VAULT ||--o{ VAULT_CONTRIBUTION : accepts
    PROPOSAL ||--o{ VOTE : receives
    LOAN ||--o{ REPAYMENT : receives
    BENEFIT_TYPE ||--o{ CLAIM : defines

    MEMBER {
        address id
        string name
        string email
        uint256 joined_at
        MemberStatus status
    }

    TOKEN {
        address contract
        string symbol
        uint256 total_supply
        uint256 max_supply
    }

    TOKEN_HOLDING {
        uint256 amount
        uint256 locked_amount
        uint256 available_amount
    }

    VAULT {
        address contract
        address stable_token
        uint256 total_balance
        uint256 total_shares
    }

    VAULT_CONTRIBUTION {
        uint256 amount
        uint256 shares
        uint256 share_percentage
        uint256 contributed_at
    }

    PROPOSAL {
        uint256 id
        ProposalType type
        string description
        uint256 for_votes
        uint256 against_votes
        uint256 start_time
        uint256 end_time
        ProposalState state
    }

    VOTE {
        uint256 proposal_id
        bool support
        uint256 weight
        uint256 voted_at
    }

    LOAN {
        uint256 id
        uint256 principal
        uint256 interest
        uint256 collateral_tokens
        uint256 due_time
        LoanStatus status
    }

    REPAYMENT {
        uint256 loan_id
        uint256 amount
        uint256 paid_at
    }

    BENEFIT_TYPE {
        bytes32 key
        string name
        uint256 max_amount
        uint256 annual_limit
        uint256 cooling_off
    }

    CLAIM {
        uint256 id
        bytes32 benefit_type
        uint256 amount
        string proof_reference
        ClaimStatus status
    }
```

---

## Network Topology

### Deployment Architecture

```mermaid
graph TB
    subgraph "Production Network"
        subgraph "Mainnet (Future)"
            M1[UnionToken]
            M2[UnionVault]
            M3[UnionDAO]
            M4[LoanDesk]
            M5[BenefitPayout]
        end
    end

    subgraph "Testnet (Current)"
        subgraph "Sepolia Testnet"
            T1[UnionToken]
            T2[UnionVault]
            T3[UnionDAO]
            T4[LoanDesk]
            T5[BenefitPayout]
        end
    end

    subgraph "Local Development"
        subgraph "Anvil Local"
            L1[UnionToken]
            L2[UnionVault]
            L3[UnionDAO]
            L4[LoanDesk]
            L5[BenefitPayout]
        end
    end

    subgraph "Frontend"
        F1[Production App]
        F2[Staging App]
        F3[Local Dev]
    end

    F1 -->|Connect| M1
    F1 -->|Connect| M2
    F1 -->|Connect| M3
    F1 -->|Connect| M4
    F1 -->|Connect| M5

    F2 -->|Connect| T1
    F2 -->|Connect| T2
    F2 -->|Connect| T3
    F2 -->|Connect| T4
    F2 -->|Connect| T5

    F3 -->|Connect| L1
    F3 -->|Connect| L2
    F3 -->|Connect| L3
    F3 -->|Connect| L4
    F3 -->|Connect| L5

    style M1 fill:#c8e6c9
    style M2 fill:#ffcc80
    style M3 fill:#ce93d8
    style T1 fill:#c8e6c9
    style T2 fill:#ffcc80
    style T3 fill:#ce93d8
```

### Transaction Flow

```mermaid
flowchart LR
    subgraph "User Side"
        A[User Wallet]
        B[Frontend App]
    end

    subgraph "Blockchain"
        C[RPC Endpoint]
        D[Mempool]
        E[Block]
    end

    subgraph "Contract Layer"
        F[UnionToken]
        G[UnionVault]
        H[UnionDAO]
    end

    subgraph "Confirmation"
        I[Transaction Receipt]
        J[Event Logs]
        K[Indexer]
    end

    A -->|Sign| B
    B -->|Broadcast| C
    C -->|Relay| D
    D -->|Include| E
    E -->|Execute| F
    E -->|Execute| G
    E -->|Execute| H

    F -->|Emit Events| J
    G -->|Emit Events| J
    H -->|Emit Events| J

    E -->|Confirm| I
    J -->|Index| K
    K -->|Update| B

    style A fill:#e1f5fe
    style F fill:#c8e6c9
    style G fill:#ffcc80
    style H fill:#ce93d8
```

---

## Security Diagrams

### Access Control Hierarchy

```mermaid
graph TB
    subgraph "Role Hierarchy"
        ROOT[DEFAULT_ADMIN_ROLE]

        ADMIN[ADMIN_ROLE]
        MINTER[MINTER_ROLE]
        BURNER[BURNER_ROLE]
        PAUSER[PAUSER_ROLE]
        APPROVER[APPROVER_ROLE]

        ROOT --> ADMIN
        ROOT --> MINTER
        ROOT --> BURNER
        ROOT --> PAUSER
        ROOT --> APPROVER
    end

    subgraph "Permissions"
        P1[Configure Contracts]
        P2[Mint Tokens]
        P3[Burn Tokens]
        P4[Pause Operations]
        P5[Approve Loans]
        P6[Approve Claims]
    end

    ROOT --> P1
    MINTER --> P2
    BURNER --> P3
    PAUSER --> P4
    APPROVER --> P5
    APPROVER --> P6

    style ROOT fill:#ffcc80
    style ADMIN fill:#c8e6c9
    style MINTER fill:#c8e6c9
    style BURNER fill:#c8e6c9
```

### Threat Defense

```mermaid
graph TB
    subgraph "Attack Vectors"
        A1[Reentrancy]
        A2[Front-running]
        A3[Flash Loans]
    end

    subgraph "Defenses"
        D1[ReentrancyGuard]
        D2[Timelocks]
        D3[Access Control]
    end

    subgraph "Monitoring"
        M1[Event Logs]
        M2[Off-chain Monitoring]
        M3[Alert System]
    end

    A1 -->|Blocked by| D1
    A2 -->|Prevented by| D2
    A3 -->|Mitigated by| D3

    D1 -->|Logged by| M1
    D2 -->|Logged by| M1
    D3 -->|Logged by| M1

    M1 -->|Analyzed by| M2
    M2 -->|Triggers| M3

    style A1 fill:#ffebee
    style A2 fill:#ffebee
    style A3 fill:#ffebee
    style D1 fill:#c8e6c9
    style D2 fill:#c8e6c9
    style D3 fill:#c8e6c9
```

---

## Gas Flow Diagram

### Gas Costs Overview

```mermaid
pie title "Estimated Gas Costs (Gwei)"
    "Join Union (Mint)" : 150000
    "Deposit to Vault" : 80000
    "Create Proposal" : 120000
    "Cast Vote" : 50000
    "Request Loan" : 100000
    "Repay Loan" : 90000
    "Claim Benefit" : 110000
```

### Gas Optimization Areas

```mermaid
mindmap
    root((Gas Optimization))
        Storage
            Pack structs
            Use uint256 where possible
            Cache storage reads
        Loops
            Batch operations
            Limit iterations
            Use mappings instead
        Events
            Indexed parameters
            Batch emissions
        Calls
            Check-effects-interactions
            Use low-level calls carefully
```

---

*Visual Diagrams v1.0 - WorkerUnionDAO*
