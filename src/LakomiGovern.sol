// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./LakomiToken.sol";

/**
 * @title LakomiGovern
 * @author Lakomi Protocol
 * @notice Democratic governance engine for the Lakomi community
 * @dev Handles proposal creation, voting, and execution
 *
 * Key Features:
 * - 1 token = 1 vote
 * - 7-day voting period
 * - 40% quorum requirement
 * - 48-hour execution timelock
 * - Multiple proposal types
 */
contract LakomiGovern is AccessControl, ReentrancyGuard, Pausable {

    // ============================================================
    //                        ENUMS
    // ============================================================

    enum ProposalType {
        SPEND,       // Transfer treasury funds
        PARAMETER,   // Change system parameters
        MEMBERSHIP,  // Add/remove members
        CUSTOM       // Other governance actions
    }

    enum ProposalState {
        Pending,     // Not yet active
        Active,      // Voting in progress
        Canceled,    // Canceled by proposer or admin
        Defeated,    // Voted down or quorum not met
        Succeeded,   // Passed voting
        Queued,      // In timelock period
        Expired,     // Execution deadline passed
        Executed     // Successfully executed
    }

    enum Vote {
        Against,
        For,
        Abstain
    }

    // ============================================================
    //                      STRUCTS
    // ============================================================

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        ProposalType proposalType;
        address target;
        uint256 value;
        bytes callData;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 startTime;
        uint256 endTime;
        uint256 queuedTime;
        uint256 executionDeadline;
        bool executed;
        bool canceled;
    }

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    /// @dev LakomiToken reference for voting power
    LakomiToken public immutable token;

    /// @dev Voting period in seconds (7 days)
    uint256 public votingPeriod;

    /// @dev Quorum numerator (40 = 40%)
    uint256 public quorumNumerator;

    /// @dev Quorum denominator
    uint256 public constant QUORUM_DENOMINATOR = 100;

    /// @dev Execution timelock in seconds (48 hours)
    uint256 public executionTimelock;

    /// @dev Execution deadline in seconds (14 days after queue)
    uint256 public executionDeadline;

    /// @dev Proposal threshold (minimum tokens to create proposal)
    uint256 public proposalThreshold;

    /// @dev All proposals
    mapping(uint256 => Proposal) public proposals;

    /// @dev Track who has voted on each proposal
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @dev Track vote choices
    mapping(uint256 => mapping(address => Vote)) public voteChoice;

    /// @dev Track vote weights
    mapping(uint256 => mapping(address => uint256)) public voteWeight;

    /// @dev Total proposal count
    uint256 public proposalCount;

    // ============================================================
    //                        EVENTS
    // ============================================================

    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        string description,
        ProposalType proposalType,
        uint256 startTime,
        uint256 endTime
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        Vote support,
        uint256 weight,
        string reason
    );

    event ProposalCanceled(uint256 indexed id, address indexed by);
    event ProposalQueued(uint256 indexed id, uint256 eta);
    event ProposalExecuted(uint256 indexed id, uint256 timestamp);
    event VotingPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event QuorumUpdated(uint256 oldNumerator, uint256 newNumerator);
    event TimelockUpdated(uint256 oldTimelock, uint256 newTimelock);

    // ============================================================
    //                        ERRORS
    // ============================================================

    error LakomiGovern__ZeroAddress();
    error LakomiGovern__EmptyDescription();
    error LakomiGovern__InsufficientTokens();
    error LakomiGovern__ProposalNotActive();
    error LakomiGovern__AlreadyVoted();
    error LakomiGovern__ProposalNotSucceeded();
    error LakomiGovern__TimelockNotMet();
    error LakomiGovern__ProposalExpired();
    error LakomiGovern__AlreadyExecuted();
    error LakomiGovern__OnlyProposer();
    error LakomiGovern__NotQueued();
    error LakomiGovern__ExecutionFailed();

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    /**
     * @dev Initialize governance with token reference
     * @param _token LakomiToken address
     */
    constructor(
        address _token,
        uint256 _votingPeriod,
        uint256 _quorumNumerator,
        uint256 _executionTimelock
    ) {
        if (_token == address(0)) revert LakomiGovern__ZeroAddress();

        token = LakomiToken(_token);
        votingPeriod = _votingPeriod;           // 7 days = 604800
        quorumNumerator = _quorumNumerator;     // 40%
        executionTimelock = _executionTimelock; // 48 hours = 172800
        executionDeadline = 14 days;
        proposalThreshold = 10 * 10**18;        // 10 LAK tokens

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ============================================================
    //                    CORE FUNCTIONS
    // ============================================================

    /**
     * @notice Creates a new proposal
     * @param description Human-readable description
     * @param proposalType The type of proposal
     * @param target Contract to call
     * @param value ETH/value to send
     * @param callData Encoded function call
     * @return proposalId The ID of the created proposal
     */
    function createProposal(
        string calldata description,
        ProposalType proposalType,
        address target,
        uint256 value,
        bytes calldata callData
    ) external nonReentrant returns (uint256 proposalId) {
        if (bytes(description).length == 0) revert LakomiGovern__EmptyDescription();
        if (token.getVotingPower(msg.sender) < proposalThreshold)
            revert LakomiGovern__InsufficientTokens();

        proposalId = proposalCount++;

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + votingPeriod;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            description: description,
            proposalType: proposalType,
            target: target,
            value: value,
            callData: callData,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            startTime: startTime,
            endTime: endTime,
            queuedTime: 0,
            executionDeadline: 0,
            executed: false,
            canceled: false
        });

        emit ProposalCreated(
            proposalId,
            msg.sender,
            description,
            proposalType,
            startTime,
            endTime
        );
    }

    /**
     * @notice Casts a vote on a proposal
     * @param proposalId The ID of the proposal
     * @param support The vote choice (Against, For, Abstain)
     */
    function castVote(uint256 proposalId, Vote support)
        external
        nonReentrant
    {
        _castVote(proposalId, support, "");
    }

    /**
     * @notice Casts a vote with a reason
     * @param proposalId The ID of the proposal
     * @param support The vote choice
     * @param reason The reason for the vote
     */
    function castVoteWithReason(
        uint256 proposalId,
        Vote support,
        string calldata reason
    ) external nonReentrant {
        _castVote(proposalId, support, reason);
    }

    function _castVote(
        uint256 proposalId,
        Vote support,
        string memory reason
    ) internal {
        Proposal storage proposal = proposals[proposalId];

        if (state(proposalId) != ProposalState.Active)
            revert LakomiGovern__ProposalNotActive();
        if (hasVoted[proposalId][msg.sender]) revert LakomiGovern__AlreadyVoted();

        uint256 weight = token.getVotingPower(msg.sender);
        if (weight == 0) revert LakomiGovern__InsufficientTokens();

        hasVoted[proposalId][msg.sender] = true;
        voteChoice[proposalId][msg.sender] = support;
        voteWeight[proposalId][msg.sender] = weight;

        if (support == Vote.For) {
            proposal.forVotes += weight;
        } else if (support == Vote.Against) {
            proposal.againstVotes += weight;
        } else {
            proposal.abstainVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight, reason);
    }

    /**
     * @notice Queues a successful proposal for execution
     * @param proposalId The ID of the proposal
     */
    function queue(uint256 proposalId) external nonReentrant {
        if (state(proposalId) != ProposalState.Succeeded)
            revert LakomiGovern__ProposalNotSucceeded();

        Proposal storage proposal = proposals[proposalId];
        proposal.queuedTime = block.timestamp;
        proposal.executionDeadline = block.timestamp + executionTimelock + executionDeadline;

        emit ProposalQueued(proposalId, block.timestamp + executionTimelock);
    }

    /**
     * @notice Executes a queued proposal after timelock
     * @param proposalId The ID of the proposal
     */
    function execute(uint256 proposalId) external nonReentrant {
        ProposalState currentState = state(proposalId);

        if (currentState != ProposalState.Queued)
            revert LakomiGovern__ProposalNotSucceeded();

        Proposal storage proposal = proposals[proposalId];

        if (block.timestamp < proposal.queuedTime + executionTimelock)
            revert LakomiGovern__TimelockNotMet();

        proposal.executed = true;

        // Execute the proposal
        (bool success, ) = proposal.target.call{value: proposal.value}(proposal.callData);
        if (!success) revert LakomiGovern__ExecutionFailed();

        emit ProposalExecuted(proposalId, block.timestamp);
    }

    /**
     * @notice Cancels a proposal
     * @param proposalId The ID of the proposal
     */
    function cancel(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];

        ProposalState currentState = state(proposalId);
        if (currentState == ProposalState.Executed) revert LakomiGovern__AlreadyExecuted();

        // Only proposer or admin can cancel
        if (
            msg.sender != proposal.proposer &&
            !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)
        ) revert LakomiGovern__OnlyProposer();

        proposal.canceled = true;

        emit ProposalCanceled(proposalId, msg.sender);
    }

    // ============================================================
    //                    VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Gets the current state of a proposal
     * @param proposalId The ID of the proposal
     * @return The current state
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.canceled) return ProposalState.Canceled;
        if (proposal.executed) return ProposalState.Executed;

        // Pending state
        if (block.timestamp < proposal.startTime) return ProposalState.Pending;

        // Active state
        if (block.timestamp < proposal.endTime) return ProposalState.Active;

        // Check if quorum met
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 quorumRequired = quorum(proposal.startTime);

        if (totalVotes < quorumRequired) return ProposalState.Defeated;
        if (proposal.forVotes <= proposal.againstVotes) return ProposalState.Defeated;

        // Succeeded
        if (proposal.queuedTime == 0) return ProposalState.Succeeded;

        // Expired
        if (block.timestamp > proposal.executionDeadline) return ProposalState.Expired;

        // Queued (in timelock)
        return ProposalState.Queued;
    }

    /**
     * @notice Calculates the quorum required
     * @param timestamp The timestamp to check at
     * @return The number of votes required
     */
    function quorum(uint256 timestamp) public view returns (uint256) {
        uint256 totalSupply = token.totalSupply();
        return (totalSupply * quorumNumerator) / QUORUM_DENOMINATOR;
    }

    /**
     * @notice Gets proposal details
     * @param proposalId The ID of the proposal
     */
    function getProposal(uint256 proposalId)
        external
        view
        returns (
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
        )
    {
        Proposal storage p = proposals[proposalId];
        return (
            p.id,
            p.proposer,
            p.description,
            p.proposalType,
            p.target,
            p.value,
            p.forVotes,
            p.againstVotes,
            p.abstainVotes,
            p.startTime,
            p.endTime,
            p.executed,
            p.canceled
        );
    }

    // ============================================================
    //                  ADMIN FUNCTIONS
    // ============================================================

    /**
     * @notice Sets the voting period
     * @param newVotingPeriod The new period in seconds
     */
    function setVotingPeriod(uint256 newVotingPeriod)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 oldPeriod = votingPeriod;
        votingPeriod = newVotingPeriod;
        emit VotingPeriodUpdated(oldPeriod, newVotingPeriod);
    }

    /**
     * @notice Sets the quorum numerator
     * @param newQuorumNumerator The new numerator (e.g., 40 for 40%)
     */
    function setQuorumNumerator(uint256 newQuorumNumerator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newQuorumNumerator <= QUORUM_DENOMINATOR, "Invalid quorum");
        uint256 oldNumerator = quorumNumerator;
        quorumNumerator = newQuorumNumerator;
        emit QuorumUpdated(oldNumerator, newQuorumNumerator);
    }

    /**
     * @notice Sets the execution timelock
     * @param newTimelock The new timelock in seconds
     */
    function setExecutionTimelock(uint256 newTimelock)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 oldTimelock = executionTimelock;
        executionTimelock = newTimelock;
        emit TimelockUpdated(oldTimelock, newTimelock);
    }

    /**
     * @notice Pause governance
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause governance
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ============================================================
    //                    RECEIVE ETH
    // ============================================================

    receive() external payable {}
}
