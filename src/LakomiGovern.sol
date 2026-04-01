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
 * @dev 1-member-1-vote governance with member-count-based quorum
 */
contract LakomiGovern is AccessControl, ReentrancyGuard, Pausable {

    // ============================================================
    //                        ENUMS
    // ============================================================

    enum ProposalType { SPEND, PARAMETER, MEMBERSHIP, CUSTOM }
    enum ProposalState { Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed }
    enum Vote { Against, For, Abstain }

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    LakomiToken public immutable token;
    uint256 public votingPeriod;
    uint256 public quorumNumerator;
    uint256 public constant QUORUM_DENOMINATOR = 100;
    uint256 public executionTimelock;

    uint256 public proposalCount;

    // Individual mappings to avoid stack too deep
    mapping(uint256 => address) public proposalProposer;
    mapping(uint256 => string) public proposalDescription;
    mapping(uint256 => ProposalType) public proposalType;
    mapping(uint256 => address) public proposalTarget;
    mapping(uint256 => uint256) public proposalValue;
    mapping(uint256 => bytes) public proposalCallData;
    mapping(uint256 => uint256) public proposalForVotes;
    mapping(uint256 => uint256) public proposalAgainstVotes;
    mapping(uint256 => uint256) public proposalAbstainVotes;
    mapping(uint256 => uint256) public proposalStartTime;
    mapping(uint256 => uint256) public proposalEndTime;
    mapping(uint256 => uint256) public proposalQueuedTime;
    mapping(uint256 => bool) public proposalExecuted;
    mapping(uint256 => bool) public proposalCanceled;

    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => Vote)) public voteChoice;

    // ============================================================
    //                        EVENTS
    // ============================================================

    event ProposalCreated(uint256 indexed id, address indexed proposer, string description, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter, Vote support);
    event ProposalQueued(uint256 indexed id, uint256 eta);
    event ProposalExecuted(uint256 indexed id);
    event ProposalCanceled(uint256 indexed id);

    // ============================================================
    //                        ERRORS
    // ============================================================

    error LakomiGovern__ZeroAddress();
    error LakomiGovern__EmptyDescription();
    error LakomiGovern__NotRegisteredMember();
    error LakomiGovern__ProposalNotActive();
    error LakomiGovern__AlreadyVoted();
    error LakomiGovern__ProposalNotSucceeded();
    error LakomiGovern__TimelockNotMet();
    error LakomiGovern__ExecutionFailed();
    error LakomiGovern__AlreadyExecuted();
    error LakomiGovern__NotProposer();

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

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ============================================================
    //                    CORE FUNCTIONS
    // ============================================================

    function createProposal(
        string calldata description,
        ProposalType _proposalType,
        address target,
        uint256 value,
        bytes calldata callData
    ) external nonReentrant returns (uint256) {
        if (bytes(description).length == 0) revert LakomiGovern__EmptyDescription();
        if (!token.isRegisteredMember(msg.sender))
            revert LakomiGovern__NotRegisteredMember();

        uint256 _proposalId = proposalCount++;
        uint256 _startTime = block.timestamp;
        uint256 _endTime = _startTime + votingPeriod;

        proposalProposer[_proposalId] = msg.sender;
        proposalDescription[_proposalId] = description;
        proposalType[_proposalId] = _proposalType;
        proposalTarget[_proposalId] = target;
        proposalValue[_proposalId] = value;
        proposalCallData[_proposalId] = callData;
        proposalStartTime[_proposalId] = _startTime;
        proposalEndTime[_proposalId] = _endTime;

        emit ProposalCreated(_proposalId, msg.sender, description, _startTime, _endTime);
        return _proposalId;
    }

    function castVote(uint256 proposalId, Vote support) external nonReentrant {
        _castVote(proposalId, support);
    }

    function castVoteWithReason(
        uint256 proposalId,
        Vote support,
        string calldata /* reason */
    ) external nonReentrant {
        _castVote(proposalId, support);
    }

    function _castVote(uint256 proposalId, Vote support) internal {
        if (state(proposalId) != ProposalState.Active) revert LakomiGovern__ProposalNotActive();
        if (hasVoted[proposalId][msg.sender]) revert LakomiGovern__AlreadyVoted();
        if (!token.isRegisteredMember(msg.sender))
            revert LakomiGovern__NotRegisteredMember();

        hasVoted[proposalId][msg.sender] = true;
        voteChoice[proposalId][msg.sender] = support;

        // 1 member = 1 vote
        if (support == Vote.For) {
            proposalForVotes[proposalId] += 1;
        } else if (support == Vote.Against) {
            proposalAgainstVotes[proposalId] += 1;
        } else {
            proposalAbstainVotes[proposalId] += 1;
        }

        emit VoteCast(proposalId, msg.sender, support);
    }

    function queue(uint256 proposalId) external nonReentrant {
        if (state(proposalId) != ProposalState.Succeeded) revert LakomiGovern__ProposalNotSucceeded();

        proposalQueuedTime[proposalId] = block.timestamp;
        emit ProposalQueued(proposalId, block.timestamp + executionTimelock);
    }

    function execute(uint256 proposalId) external nonReentrant {
        if (proposalQueuedTime[proposalId] == 0) revert LakomiGovern__ProposalNotSucceeded();
        if (block.timestamp < proposalQueuedTime[proposalId] + executionTimelock)
            revert LakomiGovern__TimelockNotMet();
        if (proposalExecuted[proposalId]) revert LakomiGovern__AlreadyExecuted();

        proposalExecuted[proposalId] = true;

        (bool success, ) = proposalTarget[proposalId].call{value: proposalValue[proposalId]}(proposalCallData[proposalId]);
        if (!success) revert LakomiGovern__ExecutionFailed();

        emit ProposalExecuted(proposalId);
    }

    function cancel(uint256 proposalId) external {
        if (proposalProposer[proposalId] != msg.sender && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender))
            revert LakomiGovern__NotProposer();
        if (proposalExecuted[proposalId]) revert LakomiGovern__AlreadyExecuted();

        proposalCanceled[proposalId] = true;
        emit ProposalCanceled(proposalId);
    }

    // ============================================================
    //                    VIEW FUNCTIONS
    // ============================================================

    function state(uint256 proposalId) public view returns (ProposalState) {
        if (proposalCanceled[proposalId]) return ProposalState.Canceled;
        if (proposalExecuted[proposalId]) return ProposalState.Executed;
        if (block.timestamp < proposalStartTime[proposalId]) return ProposalState.Pending;
        if (block.timestamp < proposalEndTime[proposalId]) return ProposalState.Active;

        // Quorum check: total votes must reach quorum percentage of member count
        uint256 totalVotes = proposalForVotes[proposalId] + proposalAgainstVotes[proposalId] + proposalAbstainVotes[proposalId];
        uint256 quorumRequired = quorum();
        if (totalVotes < quorumRequired) return ProposalState.Defeated;
        if (proposalForVotes[proposalId] <= proposalAgainstVotes[proposalId]) return ProposalState.Defeated;

        if (proposalQueuedTime[proposalId] == 0) return ProposalState.Succeeded;
        if (block.timestamp > proposalQueuedTime[proposalId] + executionTimelock + 14 days) return ProposalState.Expired;

        return ProposalState.Queued;
    }

    /// @notice Quorum based on registered member count, not token supply
    function quorum() public view returns (uint256) {
        uint256 members = token.getMemberCount();
        return (members * quorumNumerator) / QUORUM_DENOMINATOR;
    }

    // ============================================================
    //                    ADMIN FUNCTIONS
    // ============================================================

    function setVotingPeriod(uint256 newPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        votingPeriod = newPeriod;
    }

    function setQuorumNumerator(uint256 newQuorum) external onlyRole(DEFAULT_ADMIN_ROLE) {
        quorumNumerator = newQuorum;
    }

    function setExecutionTimelock(uint256 newTimelock) external onlyRole(DEFAULT_ADMIN_ROLE) {
        executionTimelock = newTimelock;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
