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
 */
contract LakomiGovern is AccessControl, ReentrancyGuard, Pausable {

    // ============================================================
    //                        ENUMS
    // ============================================================

    enum ProposalType { SPEND, PARAMETER, MEMBERSHIP, CUSTOM }
    enum ProposalState { Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed }
    enum Vote { Against, For, Abstain }

    // ============================================================
    //                      STRUCTS (Split to avoid stack too deep)
    // ============================================================

    struct ProposalCore {
        uint256 id;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool canceled;
    }

    struct ProposalVotes {
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
    }

    struct ProposalExecution {
        ProposalType proposalType;
        address target;
        uint256 value;
        bytes callData;
        uint256 queuedTime;
        uint256 executionDeadline;
    }

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

    LakomiToken public immutable token;
    uint256 public votingPeriod;
    uint256 public quorumNumerator;
    uint256 public constant QUORUM_DENOMINATOR = 100;
    uint256 public executionTimelock;
    uint256 public executionDeadline;
    uint256 public proposalThreshold;
    uint256 public proposalCount;

    mapping(uint256 => ProposalCore) public proposalCores;
    mapping(uint256 => ProposalVotes) public proposalVotes;
    mapping(uint256 => ProposalExecution) public proposalExecutions;
    mapping(uint256 => string) public proposalDescriptions;

    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => Vote)) public voteChoice;
    mapping(uint256 => mapping(address => uint256)) public voteWeight;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ============================================================
    //                        EVENTS
    // ============================================================

    event ProposalCreated(uint256 indexed id, address indexed proposer, string description, ProposalType proposalType, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter, Vote support, uint256 weight, string reason);
    event ProposalQueued(uint256 indexed id, uint256 eta);
    event ProposalExecuted(uint256 indexed id);
    event ProposalCanceled(uint256 indexed id, address canceledBy);
    event VotingPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);
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
    error LakomiGovern__ExecutionFailed();
    error LakomiGovern__AlreadyExecuted();
    error LakomiGovern__NotProposer();
    error LakomiGovern__InvalidDuration();

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    constructor(
        address _token,
        uint256 _votingPeriod,
        uint256 _quorumNumerator,
        uint256 _executionTimelock
    ) {
        if (_token == address(0)) revert LakomiGovern__ZeroAddress();

        token = LakomiToken(_token);
        votingPeriod = _votingPeriod;
        quorumNumerator = _quorumNumerator;
        executionTimelock = _executionTimelock;
        executionDeadline = 14 days;
        proposalThreshold = 10 * 10**18;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============================================================
    //                    CORE FUNCTIONS
    // ============================================================

    function createProposal(
        string calldata description,
        ProposalType proposalType,
        address target,
        uint256 value,
        bytes calldata callData
    ) external nonReentrant returns (uint256) {
        if (bytes(description).length == 0) revert LakomiGovern__EmptyDescription();
        if (token.getVotingPower(msg.sender) < proposalThreshold)
            revert LakomiGovern__InsufficientTokens();

        uint256 _startTime = block.timestamp;
        uint256 _endTime = _startTime + votingPeriod;
        uint256 _proposalId = proposalCount++;

        // Store in split structs
        proposalCores[_proposalId] = ProposalCore({
            id: _proposalId,
            proposer: msg.sender,
            startTime: _startTime,
            endTime: _endTime,
            executed: false,
            canceled: false
        });

        proposalVotes[_proposalId] = ProposalVotes({
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0
        });

        proposalExecutions[_proposalId] = ProposalExecution({
            proposalType: proposalType,
            target: target,
            value: value,
            callData: callData,
            queuedTime: 0,
            executionDeadline: 0
        });

        proposalDescriptions[_proposalId] = description;

        emit ProposalCreated(_proposalId, msg.sender, description, proposalType, _startTime, _endTime);
        return _proposalId;
    }

    function castVote(uint256 proposalId, Vote support) external nonReentrant {
        _castVote(proposalId, support, "");
    }

    function castVoteWithReason(uint256 proposalId, Vote support, string calldata reason) external nonReentrant {
        _castVote(proposalId, support, reason);
    }

    function _castVote(uint256 proposalId, Vote support, string memory reason) internal {
        if (state(proposalId) != ProposalState.Active) revert LakomiGovern__ProposalNotActive();
        if (hasVoted[proposalId][msg.sender]) revert LakomiGovern__AlreadyVoted();

        uint256 weight = token.getVotingPower(msg.sender);
        if (weight == 0) revert LakomiGovern__InsufficientTokens();

        hasVoted[proposalId][msg.sender] = true;
        voteChoice[proposalId][msg.sender] = support;
        voteWeight[proposalId][msg.sender] = weight;

        ProposalVotes storage votes = proposalVotes[proposalId];
        if (support == Vote.For) {
            votes.forVotes += weight;
        } else if (support == Vote.Against) {
            votes.againstVotes += weight;
        } else {
            votes.abstainVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight, reason);
    }

    function queue(uint256 proposalId) external nonReentrant {
        if (state(proposalId) != ProposalState.Succeeded) revert LakomiGovern__ProposalNotSucceeded();

        ProposalExecution storage exec = proposalExecutions[proposalId];
        exec.queuedTime = block.timestamp;
        exec.executionDeadline = block.timestamp + executionTimelock + executionDeadline;

        emit ProposalQueued(proposalId, exec.executionDeadline);
    }

    function execute(uint256 proposalId) external nonReentrant {
        ProposalExecution storage exec = proposalExecutions[proposalId];

        // Check timelock has passed
        if (block.timestamp < exec.queuedTime + executionTimelock)
            revert LakomiGovern__TimelockNotMet();

        ProposalCore storage core = proposalCores[proposalId];

        core.executed = true;

        (bool success, ) = exec.target.call{value: exec.value}(exec.callData);
        if (!success) revert LakomiGovern__ExecutionFailed();

        emit ProposalExecuted(proposalId);
    }

    function cancel(uint256 proposalId) external {
        ProposalCore storage core = proposalCores[proposalId];
        if (core.proposer != msg.sender && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender))
            revert LakomiGovern__NotProposer();
        if (core.executed) revert LakomiGovern__AlreadyExecuted();

        core.canceled = true;
        emit ProposalCanceled(proposalId, msg.sender);
    }

    // ============================================================
    //                    VIEW FUNCTIONS
    // ============================================================

    function state(uint256 proposalId) public view returns (ProposalState) {
        ProposalCore storage core = proposalCores[proposalId];

        if (core.canceled) return ProposalState.Canceled;
        if (core.executed) return ProposalState.Executed;
        if (block.timestamp < core.startTime) return ProposalState.Pending;
        if (block.timestamp < core.endTime) return ProposalState.Active;

        if (!_quorumMet(proposalId)) return ProposalState.Defeated;

        ProposalVotes storage votes = proposalVotes[proposalId];
        if (votes.forVotes <= votes.againstVotes) return ProposalState.Defeated;

        ProposalExecution storage exec = proposalExecutions[proposalId];
        if (exec.queuedTime == 0) return ProposalState.Succeeded;
        if (block.timestamp > exec.executionDeadline) return ProposalState.Expired;

        return ProposalState.Queued;
    }

    function _quorumMet(uint256 proposalId) internal view returns (bool) {
        ProposalCore storage core = proposalCores[proposalId];
        ProposalVotes storage votes = proposalVotes[proposalId];
        uint256 totalVotes = votes.forVotes + votes.againstVotes + votes.abstainVotes;
        uint256 quorumRequired = (token.totalSupply() * quorumNumerator) / QUORUM_DENOMINATOR;
        return totalVotes >= quorumRequired;
    }

    function quorum(uint256) public pure returns (uint256) {
        return 0; // Calculated dynamically in _quorumMet
    }

    function getProposal(uint256 proposalId) external view returns (
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
    ) {
        ProposalCore storage core = proposalCores[proposalId];
        ProposalVotes storage votes = proposalVotes[proposalId];
        ProposalExecution storage exec = proposalExecutions[proposalId];

        return (
            core.id,
            core.proposer,
            proposalDescriptions[proposalId],
            exec.proposalType,
            exec.target,
            exec.value,
            votes.forVotes,
            votes.againstVotes,
            votes.abstainVotes,
            core.startTime,
            core.endTime,
            core.executed,
            core.canceled
        );
    }

    // ============================================================
    //                    ADMIN FUNCTIONS
    // ============================================================

    function setVotingPeriod(uint256 newPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldPeriod = votingPeriod;
        votingPeriod = newPeriod;
        emit VotingPeriodUpdated(oldPeriod, newPeriod);
    }

    function setQuorumNumerator(uint256 newQuorum) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldQuorum = quorumNumerator;
        quorumNumerator = newQuorum;
        emit QuorumUpdated(oldQuorum, newQuorum);
    }

    function setExecutionTimelock(uint256 newTimelock) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldTimelock = executionTimelock;
        executionTimelock = newTimelock;
        emit TimelockUpdated(oldTimelock, newTimelock);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
