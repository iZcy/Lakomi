// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./LakomiToken.sol";

/**
 * @title LakomiGovern
 * @author Lakomi Protocol
 * @notice Democratic governance engine for the Lakomi cooperative (koperasi)
 * @dev UU 25/1992 compliant: 1-member-1-vote (Pasal 22), Rapat Anggota (Pasal 26-27), Pengawas (Pasal 38)
 */
contract LakomiGovern is AccessControl, ReentrancyGuard, Pausable {

    // ============================================================
    //                        ENUMS
    // ============================================================

    enum ProposalType { SPEND, PARAMETER, MEMBERSHIP, RAT_ANNUAL, CUSTOM }
    enum ProposalState { Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed, Vetoed }
    enum Vote { Against, For, Abstain }

    // ============================================================
    //                    PENGAWAS (UU 25/1992 Pasal 38)
    // ============================================================

    bytes32 public constant PENGAWAS_ROLE = keccak256("PENGAWAS_ROLE");

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    LakomiToken public immutable token;
    uint256 public votingPeriod;
    uint256 public quorumNumerator;
    uint256 public constant QUORUM_DENOMINATOR = 100;
    uint256 public executionTimelock;

    uint256 public proposalCount;

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
    mapping(uint256 => bool) public proposalVetoed;

    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => Vote)) public voteChoice;

    uint256 public ratPeriod;
    uint256 public lastRATTime;
    address public vaultAddress;

    // ============================================================
    //                        EVENTS
    // ============================================================

    event ProposalCreated(uint256 indexed id, address indexed proposer, string description, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter, Vote support);
    event ProposalQueued(uint256 indexed id, uint256 eta);
    event ProposalExecuted(uint256 indexed id);
    event ProposalCanceled(uint256 indexed id);
    event ProposalVetoed(uint256 indexed id, address indexed pengawas);
    event RATScheduled(uint256 indexed proposalId, uint256 scheduledTime);

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
    error LakomiGovern__ProposalVetoed();
    error LakomiGovern__NotPengawas();
    error LakomiGovern__RATNotDue();

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
        ratPeriod = 365 days;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PENGAWAS_ROLE, msg.sender);
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
    //           PENGAWAS VETO (UU 25/1992 Pasal 38)
    // ============================================================

    /**
     * @notice Pengawas can veto a proposal before execution
     * @dev Implements UU 25/1992 Pasal 38 — pengawas supervises kebijaksanaan pengurus
     */
    function vetoProposal(uint256 proposalId) external onlyRole(PENGAWAS_ROLE) {
        if (proposalExecuted[proposalId]) revert LakomiGovern__AlreadyExecuted();
        if (proposalCanceled[proposalId]) revert LakomiGovern__AlreadyExecuted();

        proposalVetoed[proposalId] = true;
        emit ProposalVetoed(proposalId, msg.sender);
    }

    /**
     * @notice Pengawas can trigger emergency pause on governance
     */
    function pengawasPause() external onlyRole(PENGAWAS_ROLE) {
        _pause();
    }

    // ============================================================
    //         RAT ANNUAL (UU 25/1992 Pasal 26-27)
    // ============================================================

    /**
     * @notice Creates the annual Rapat Anggota Tahunan (RAT) proposal
     * @dev UU 25/1992 Pasal 27 — RAT decides SHU, financial reports, elections
     *      Can be called by any member once per year
     */
    function scheduleAnnualRAT(string calldata description) external nonReentrant returns (uint256) {
        if (!token.isRegisteredMember(msg.sender))
            revert LakomiGovern__NotRegisteredMember();

        if (lastRATTime > 0 && block.timestamp < lastRATTime + ratPeriod) {
            revert LakomiGovern__RATNotDue();
        }

        uint256 _proposalId = proposalCount++;
        uint256 _startTime = block.timestamp;
        uint256 _endTime = _startTime + votingPeriod;

        proposalProposer[_proposalId] = msg.sender;
        proposalDescription[_proposalId] = description;
        proposalType[_proposalId] = ProposalType.RAT_ANNUAL;
        proposalTarget[_proposalId] = address(0);
        proposalValue[_proposalId] = 0;
        proposalCallData[_proposalId] = "";
        proposalStartTime[_proposalId] = _startTime;
        proposalEndTime[_proposalId] = _endTime;

        lastRATTime = block.timestamp;

        emit ProposalCreated(_proposalId, msg.sender, description, _startTime, _endTime);
        emit RATScheduled(_proposalId, block.timestamp);
        return _proposalId;
    }

    /**
     * @notice Check if RAT is due
     */
    function isRATDue() external view returns (bool) {
        if (lastRATTime == 0) return true;
        return block.timestamp >= lastRATTime + ratPeriod;
    }

    /**
     * @notice Get time until next RAT
     */
    function timeUntilNextRAT() external view returns (uint256) {
        if (lastRATTime == 0) return 0;
        uint256 next = lastRATTime + ratPeriod;
        if (block.timestamp >= next) return 0;
        return next - block.timestamp;
    }

    // ============================================================
    //                    VIEW FUNCTIONS
    // ============================================================

    function state(uint256 proposalId) public view returns (ProposalState) {
        if (proposalCanceled[proposalId]) return ProposalState.Canceled;
        if (proposalVetoed[proposalId]) return ProposalState.Vetoed;
        if (proposalExecuted[proposalId]) return ProposalState.Executed;
        if (block.timestamp < proposalStartTime[proposalId]) return ProposalState.Pending;
        if (block.timestamp < proposalEndTime[proposalId]) return ProposalState.Active;

        uint256 totalVotes = proposalForVotes[proposalId] + proposalAgainstVotes[proposalId] + proposalAbstainVotes[proposalId];
        uint256 quorumRequired = quorum();
        if (totalVotes < quorumRequired) return ProposalState.Defeated;
        if (proposalForVotes[proposalId] <= proposalAgainstVotes[proposalId]) return ProposalState.Defeated;

        if (proposalQueuedTime[proposalId] == 0) return ProposalState.Succeeded;
        if (block.timestamp > proposalQueuedTime[proposalId] + executionTimelock + 14 days) return ProposalState.Expired;

        return ProposalState.Queued;
    }

    function getProposal(uint256 proposalId) external view returns (
        address proposer,
        string memory description,
        ProposalType pType,
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        bool executed,
        bool canceled,
        bool vetoed
    ) {
        return (
            proposalProposer[proposalId],
            proposalDescription[proposalId],
            proposalType[proposalId],
            proposalStartTime[proposalId],
            proposalEndTime[proposalId],
            proposalForVotes[proposalId],
            proposalAgainstVotes[proposalId],
            proposalAbstainVotes[proposalId],
            proposalExecuted[proposalId],
            proposalCanceled[proposalId],
            proposalVetoed[proposalId]
        );
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
