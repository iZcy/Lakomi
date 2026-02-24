// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LakomiToken.sol";
import "../src/LakomiVault.sol";
import "../src/LakomiGovern.sol";
import "../src/mocks/MockUSDC.sol";

contract LakomiGovernTest is Test {
    LakomiToken public token;
    LakomiVault public vault;
    LakomiGovern public govern;
    MockUSDC public usdc;

    address public admin;
    address public alice;
    address public bob;
    address public charlie;

    uint256 constant VOTING_PERIOD = 7 days;
    uint256 constant QUORUM = 40; // 40%
    uint256 constant TIMELOCK = 48 hours;

    function setUp() public {
        admin = address(this);
        alice = address(0x1);
        bob = address(0x2);
        charlie = address(0x3);

        // Deploy contracts
        usdc = new MockUSDC();
        vault = new LakomiVault(address(usdc), 1000 * 10**6, 48 hours);
        token = new LakomiToken();
        govern = new LakomiGovern(
            address(token),
            VOTING_PERIOD,
            QUORUM,
            TIMELOCK
        );

        // Setup: Mint tokens to members
        token.mint(alice, 400 * 10**18); // 40% voting power
        token.mint(bob, 300 * 10**18);   // 30% voting power
        token.mint(charlie, 300 * 10**18); // 30% voting power

        // Give USDC to members for deposits
        usdc.transfer(alice, 5000 * 10**6);
        usdc.transfer(bob, 5000 * 10**6);
        usdc.transfer(charlie, 5000 * 10**6);

        // Members deposit to vault
        vm.startPrank(alice);
        usdc.approve(address(vault), 5000 * 10**6);
        vault.deposit(5000 * 10**6);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), 5000 * 10**6);
        vault.deposit(5000 * 10**6);
        vm.stopPrank();
    }

    // ============================================================
    //                    DEPLOYMENT TESTS
    // ============================================================

    function test_Deployment() public view {
        assertEq(address(govern.token()), address(token));
        assertEq(govern.votingPeriod(), VOTING_PERIOD);
        assertEq(govern.quorumNumerator(), QUORUM);
        assertEq(govern.executionTimelock(), TIMELOCK);
        assertEq(govern.proposalCount(), 0);
    }

    // ============================================================
    //                    PROPOSAL CREATION TESTS
    // ============================================================

    function test_CreateProposal() public {
        vm.prank(alice);
        uint256 proposalId = govern.createProposal(
            "Fund community kitchen",
            LakomiGovern.ProposalType.SPEND,
            address(vault),
            0,
            abi.encodeWithSignature("governanceSpend(address,uint256,bytes)", address(0x999), 1000 * 10**6, "")
        );

        assertEq(proposalId, 0);
        assertEq(govern.proposalCount(), 1);
    }

    function test_RevertWhen_CreateProposalWithoutTokens() public {
        address noTokens = address(0x999);

        vm.prank(noTokens);
        vm.expectRevert(LakomiGovern.LakomiGovern__InsufficientTokens.selector);
        govern.createProposal(
            "Test proposal",
            LakomiGovern.ProposalType.CUSTOM,
            address(0),
            0,
            ""
        );
    }

    function test_RevertWhen_CreateProposalEmptyDescription() public {
        vm.prank(alice);
        vm.expectRevert(LakomiGovern.LakomiGovern__EmptyDescription.selector);
        govern.createProposal(
            "",
            LakomiGovern.ProposalType.CUSTOM,
            address(0),
            0,
            ""
        );
    }

    // ============================================================
    //                    VOTING TESTS
    // ============================================================

    function test_CastVote() public {
        // Create proposal
        vm.prank(alice);
        uint256 proposalId = _createTestProposal();

        // Alice votes for
        vm.prank(alice);
        govern.castVote(proposalId, LakomiGovern.Vote.For);

        (,,,,,, uint256 forVotes, uint256 againstVotes,,,,,) = govern.getProposal(proposalId);
        assertEq(forVotes, 400 * 10**18);
        assertEq(againstVotes, 0);
        assertTrue(govern.hasVoted(proposalId, alice));
    }

    function test_CastVoteWithReason() public {
        vm.prank(alice);
        uint256 proposalId = _createTestProposal();

        vm.prank(bob);
        govern.castVoteWithReason(
            proposalId,
            LakomiGovern.Vote.For,
            "This is a great idea!"
        );

        assertTrue(govern.hasVoted(proposalId, bob));
    }

    function test_RevertWhen_VoteTwice() public {
        vm.prank(alice);
        uint256 proposalId = _createTestProposal();

        vm.prank(alice);
        govern.castVote(proposalId, LakomiGovern.Vote.For);

        vm.prank(alice);
        vm.expectRevert(LakomiGovern.LakomiGovern__AlreadyVoted.selector);
        govern.castVote(proposalId, LakomiGovern.Vote.Against);
    }

    function test_RevertWhen_VoteOnNonActiveProposal() public {
        vm.prank(alice);
        uint256 proposalId = _createTestProposal();

        // Warp past voting period
        vm.warp(block.timestamp + VOTING_PERIOD + 1);

        vm.prank(bob);
        vm.expectRevert(LakomiGovern.LakomiGovern__ProposalNotActive.selector);
        govern.castVote(proposalId, LakomiGovern.Vote.For);
    }

    // ============================================================
    //                    PROPOSAL STATE TESTS
    // ============================================================

    function test_ProposalState_Pending() public {
        vm.prank(alice);
        uint256 proposalId = _createTestProposal();

        assertEq(uint(govern.state(proposalId)), uint(LakomiGovern.ProposalState.Active));
    }

    function test_ProposalState_Defeated_NoQuorum() public {
        vm.prank(alice);
        uint256 proposalId = _createTestProposal();

        // Only Alice votes (40% meets 40% quorum exactly, so it passes)
        // To test defeated-by-quorum, we need less than quorum
        // Bob has 30% which is less than 40% quorum
        vm.prank(bob);
        govern.castVote(proposalId, LakomiGovern.Vote.For);

        // Warp past voting period
        vm.warp(block.timestamp + VOTING_PERIOD + 1);

        assertEq(uint(govern.state(proposalId)), uint(LakomiGovern.ProposalState.Defeated));
    }

    function test_ProposalState_Succeeded() public {
        vm.prank(alice);
        uint256 proposalId = _createTestProposal();

        // Alice and Bob vote (70% total, meets quorum)
        vm.prank(alice);
        govern.castVote(proposalId, LakomiGovern.Vote.For);
        vm.prank(bob);
        govern.castVote(proposalId, LakomiGovern.Vote.For);

        // Warp past voting period
        vm.warp(block.timestamp + VOTING_PERIOD + 1);

        assertEq(uint(govern.state(proposalId)), uint(LakomiGovern.ProposalState.Succeeded));
    }

    function test_ProposalState_Defeated_MoreAgainst() public {
        vm.prank(alice);
        uint256 proposalId = _createTestProposal();

        // Alice votes for (40%), Bob and Charlie vote against (60%)
        vm.prank(alice);
        govern.castVote(proposalId, LakomiGovern.Vote.For);
        vm.prank(bob);
        govern.castVote(proposalId, LakomiGovern.Vote.Against);
        vm.prank(charlie);
        govern.castVote(proposalId, LakomiGovern.Vote.Against);

        vm.warp(block.timestamp + VOTING_PERIOD + 1);

        assertEq(uint(govern.state(proposalId)), uint(LakomiGovern.ProposalState.Defeated));
    }

    // ============================================================
    //                    EXECUTION TESTS
    // ============================================================

    function test_QueueAndExecute() public {
        // Setup: Grant govern role to governance contract
        vault.grantRole(vault.GOVERN_ROLE(), address(govern));

        // Create a real spending proposal
        vm.prank(alice);
        uint256 proposalId = govern.createProposal(
            "Fund community project",
            LakomiGovern.ProposalType.SPEND,
            address(vault),
            0,
            abi.encodeWithSignature("governanceSpend(address,uint256,bytes)", address(0x999), 500 * 10**6, "")
        );

        // Vote
        vm.prank(alice);
        govern.castVote(proposalId, LakomiGovern.Vote.For);
        vm.prank(bob);
        govern.castVote(proposalId, LakomiGovern.Vote.For);

        // Warp past voting period
        vm.warp(block.timestamp + VOTING_PERIOD + 1);

        // Queue
        govern.queue(proposalId);
        assertEq(uint(govern.state(proposalId)), uint(LakomiGovern.ProposalState.Queued));

        // Warp past timelock
        vm.warp(block.timestamp + TIMELOCK + 1);

        // Execute
        govern.execute(proposalId);
        assertEq(uint(govern.state(proposalId)), uint(LakomiGovern.ProposalState.Executed));
    }

    function test_RevertWhen_ExecuteBeforeTimelock() public {
        vm.prank(alice);
        uint256 proposalId = _createTestProposal();

        vm.prank(alice);
        govern.castVote(proposalId, LakomiGovern.Vote.For);
        vm.prank(bob);
        govern.castVote(proposalId, LakomiGovern.Vote.For);

        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        govern.queue(proposalId);

        // Try to execute immediately (before timelock)
        vm.expectRevert(LakomiGovern.LakomiGovern__TimelockNotMet.selector);
        govern.execute(proposalId);
    }

    // ============================================================
    //                    CANCEL TESTS
    // ============================================================

    function test_CancelByProposer() public {
        vm.prank(alice);
        uint256 proposalId = _createTestProposal();

        vm.prank(alice);
        govern.cancel(proposalId);

        assertEq(uint(govern.state(proposalId)), uint(LakomiGovern.ProposalState.Canceled));
    }

    function test_CancelByAdmin() public {
        vm.prank(alice);
        uint256 proposalId = _createTestProposal();

        govern.cancel(proposalId);

        assertEq(uint(govern.state(proposalId)), uint(LakomiGovern.ProposalState.Canceled));
    }

    // ============================================================
    //                    ADMIN TESTS
    // ============================================================

    function test_SetVotingPeriod() public {
        govern.setVotingPeriod(14 days);
        assertEq(govern.votingPeriod(), 14 days);
    }

    function test_SetQuorumNumerator() public {
        govern.setQuorumNumerator(50);
        assertEq(govern.quorumNumerator(), 50);
    }

    function test_SetExecutionTimelock() public {
        govern.setExecutionTimelock(72 hours);
        assertEq(govern.executionTimelock(), 72 hours);
    }

    // ============================================================
    //                    HELPER FUNCTIONS
    // ============================================================

    function _createTestProposal() internal returns (uint256) {
        return govern.createProposal(
            "Test proposal",
            LakomiGovern.ProposalType.CUSTOM,
            address(vault),
            0,
            ""
        );
    }
}
