// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LakomiToken.sol";
import "../src/LakomiVault.sol";
import "../src/mocks/MockUSDC.sol";

contract LakomiVaultTest is Test {
    LakomiToken public token;
    LakomiVault public vault;
    MockUSDC public usdc;

    address public admin;
    address public alice;
    address public bob;

    uint256 constant DEPOSIT_AMOUNT = 1000 * 10**6; // 1000 USDC

    function setUp() public {
        admin = address(this);
        alice = address(0x1);
        bob = address(0x2);

        usdc = new MockUSDC();
        vault = new LakomiVault(
            address(usdc),
            1000 * 10**6,
            48 hours,
            100 * 10**6,
            10 * 10**6,
            30 days
        );
        token = new LakomiToken();

        // Give Alice and Bob some USDC
        usdc.transfer(alice, 10_000 * 10**6);
        usdc.transfer(bob, 10_000 * 10**6);
    }

    // ============================================================
    //                    DEPLOYMENT TESTS
    // ============================================================

    function test_Deployment() public view {
        assertEq(address(vault.stableToken()), address(usdc));
        assertEq(vault.withdrawalThreshold(), 1000 * 10**6);
        assertEq(vault.withdrawalTimelock(), 48 hours);
        assertEq(vault.totalShares(), 0);
    }

    // ============================================================
    //                    DEPOSIT TESTS
    // ============================================================

    function test_Deposit() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        assertEq(vault.contributions(alice), DEPOSIT_AMOUNT);
        assertEq(vault.shares(alice), DEPOSIT_AMOUNT);
        assertEq(vault.totalShares(), DEPOSIT_AMOUNT);
        assertEq(vault.getTotalAssets(), DEPOSIT_AMOUNT);
    }

    function test_DepositMultipleMembers() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        assertEq(vault.contributions(alice), DEPOSIT_AMOUNT);
        assertEq(vault.contributions(bob), DEPOSIT_AMOUNT);
        assertEq(vault.totalShares(), DEPOSIT_AMOUNT * 2);
    }

    function test_RevertWhen_DepositZero() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), 0);
        vm.expectRevert(LakomiVault.LakomiVault__ZeroAmount.selector);
        vault.deposit(0);
        vm.stopPrank();
    }

    // ============================================================
    //                    WITHDRAWAL TESTS
    // ============================================================

    function test_WithdrawUnderThreshold() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        uint256 withdrawAmount = 500 * 10**6;
        vault.withdraw(withdrawAmount);
        vm.stopPrank();

        assertEq(vault.contributions(alice), DEPOSIT_AMOUNT - withdrawAmount);
        assertEq(usdc.balanceOf(alice), 10_000 * 10**6 - DEPOSIT_AMOUNT + withdrawAmount);
    }

    function test_RevertWhen_WithdrawOverThreshold() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT * 2);
        vault.deposit(DEPOSIT_AMOUNT * 2);

        vm.expectRevert(LakomiVault.LakomiVault__ExceedsThreshold.selector);
        vault.withdraw(DEPOSIT_AMOUNT); // 1000 USDC = threshold, >= fails
        vm.stopPrank();
    }

    function test_RevertWhen_WithdrawInsufficientBalance() public {
        // Deposit a small amount (500 USDC, under threshold)
        vm.startPrank(alice);
        usdc.approve(address(vault), 500 * 10**6);
        vault.deposit(500 * 10**6);

        // Try to withdraw more than balance (still under threshold)
        vm.expectRevert(LakomiVault.LakomiVault__InsufficientBalance.selector);
        vault.withdraw(600 * 10**6); // 600 USDC > 500 USDC balance
        vm.stopPrank();
    }

    // ============================================================
    //                    LARGE WITHDRAWAL TESTS
    // ============================================================

    function test_RequestLargeWithdrawal() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        uint256 withdrawId = vault.requestWithdrawal(alice, DEPOSIT_AMOUNT);

        (address recipient, uint256 amount, uint256 timestamp, uint256 executableAt, bool executed, ) =
            vault.getPendingWithdrawal(withdrawId);

        assertEq(recipient, alice);
        assertEq(amount, DEPOSIT_AMOUNT);
        assertFalse(executed);
        assertEq(executableAt, timestamp + 48 hours);
        vm.stopPrank();
    }

    function test_ExecuteLargeWithdrawal() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        uint256 withdrawId = vault.requestWithdrawal(alice, DEPOSIT_AMOUNT);
        vm.stopPrank();

        // Grant GOVERN_ROLE to admin (this contract) for approval
        vault.grantRole(vault.GOVERN_ROLE(), admin);
        vault.approveWithdrawal(withdrawId);
        vm.warp(block.timestamp + 48 hours + 1);
        vault.executeWithdrawal(withdrawId);

        (,,,, bool executed,) = vault.getPendingWithdrawal(withdrawId);
        assertTrue(executed);
        assertEq(usdc.balanceOf(alice), 10_000 * 10**6);
    }

    function test_RevertWhen_ExecuteBeforeTimelock() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        uint256 withdrawId = vault.requestWithdrawal(alice, DEPOSIT_AMOUNT);
        vm.stopPrank();

        // Grant GOVERN_ROLE to admin (this contract) for approval
        vault.grantRole(vault.GOVERN_ROLE(), admin);
        vault.approveWithdrawal(withdrawId);

        vm.expectRevert(LakomiVault.LakomiVault__TimelockNotMet.selector);
        vault.executeWithdrawal(withdrawId);
    }

    function test_CancelWithdrawal() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);

        uint256 withdrawId = vault.requestWithdrawal(alice, DEPOSIT_AMOUNT);
        vault.cancelWithdrawal(withdrawId);
        vm.stopPrank();

        (,,,, bool executed,) = vault.getPendingWithdrawal(withdrawId);
        assertTrue(executed);
    }

    // ============================================================
    //                    GOVERNANCE SPEND TEST
    // ============================================================

    function test_GovernanceSpend() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        vault.grantRole(vault.GOVERN_ROLE(), admin);

        address projectWallet = address(0x999);
        vault.governanceSpend(projectWallet, 500 * 10**6, "Community kitchen");

        assertEq(usdc.balanceOf(projectWallet), 500 * 10**6);
    }

    // ============================================================
    //                    VIEW FUNCTION TESTS
    // ============================================================

    function test_GetMemberSharePercent() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        assertEq(vault.getMemberSharePercent(alice), 5000);
        assertEq(vault.getMemberSharePercent(bob), 5000);
    }

    function test_GetMemberValue() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        assertEq(vault.getMemberValue(alice), DEPOSIT_AMOUNT);
    }

    // ============================================================
    //                    ADMIN TESTS
    // ============================================================

    function test_SetWithdrawalThreshold() public {
        vault.setWithdrawalThreshold(2000 * 10**6);
        assertEq(vault.withdrawalThreshold(), 2000 * 10**6);
    }

    function test_SetWithdrawalTimelock() public {
        vault.setWithdrawalTimelock(24 hours);
        assertEq(vault.withdrawalTimelock(), 24 hours);
    }

    function test_Pause() public {
        vault.pause();
        assertTrue(vault.paused());

        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vm.expectRevert();
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();
    }

    function test_EmergencyWithdraw() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        vault.emergencyWithdraw(address(usdc), admin, DEPOSIT_AMOUNT);

        assertEq(usdc.balanceOf(admin), usdc.totalSupply() - 10_000 * 10**6 * 2 + DEPOSIT_AMOUNT);
    }

    // ============================================================
    //                    FUZZ TESTS
    // ============================================================

    function testFuzz_Deposit(uint256 amount) public {
        amount = bound(amount, 1 * 10**6, 10_000 * 10**6);

        vm.startPrank(alice);
        usdc.approve(address(vault), amount);
        vault.deposit(amount);
        assertEq(vault.contributions(alice), amount);
        vm.stopPrank();
    }

    // ============================================================
    //              CONTRIBUTION TIER TESTS
    // ============================================================

    function test_ContributionTier_Tier1() public {
        // Under 500 USDC = Tier 1
        vm.startPrank(alice);
        usdc.approve(address(vault), 100 * 10**6);
        vault.deposit(100 * 10**6);
        vm.stopPrank();

        assertEq(vault.getContributionTier(alice), 1);
    }

    function test_ContributionTier_Tier2() public {
        // 500+ USDC = Tier 2
        vm.startPrank(alice);
        usdc.approve(address(vault), 500 * 10**6);
        vault.deposit(500 * 10**6);
        vm.stopPrank();

        assertEq(vault.getContributionTier(alice), 2);
    }

    function test_ContributionTier_Tier3() public {
        // 2000+ USDC = Tier 3
        vm.startPrank(alice);
        usdc.approve(address(vault), 2000 * 10**6);
        vault.deposit(2000 * 10**6);
        vm.stopPrank();

        assertEq(vault.getContributionTier(alice), 3);
    }

    function test_ContributionTier_NoDeposit() public {
        // No deposit = Tier 1
        assertEq(vault.getContributionTier(alice), 1);
    }

    function test_ContributionScore() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), 1000 * 10**6);
        vault.deposit(1000 * 10**6);
        vm.stopPrank();

        uint256 score = vault.contributionScore(alice);
        // 1000 USDC = 1000 base score
        assertEq(score, 1000);
    }

    function test_ContributionScore_WithDurationBonus() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), 1000 * 10**6);
        vault.deposit(1000 * 10**6);
        vm.stopPrank();

        // Warp 30 days
        vm.warp(block.timestamp + 30 days);

        uint256 score = vault.contributionScore(alice);
        // 1000 base + 10 (1 month * 10) = 1010
        assertEq(score, 1010);
    }

    function test_FirstDepositTimeTracked() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), 500 * 10**6);
        vault.deposit(500 * 10**6);
        vm.stopPrank();

        assertGt(vault.firstDepositTime(alice), 0);
    }
}
