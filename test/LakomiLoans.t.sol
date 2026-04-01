// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LakomiToken.sol";
import "../src/LakomiVault.sol";
import "../src/LakomiLoans.sol";
import "../src/mocks/MockUSDC.sol";

contract LakomiLoansTest is Test {
    LakomiToken public token;
    LakomiVault public vault;
    LakomiLoans public loans;
    MockUSDC public usdc;

    address public admin;
    address public alice;
    address public bob;

    uint256 constant CONTRIBUTION = 1000 * 10**6; // 1000 USDC

    function setUp() public {
        admin = address(this);
        alice = address(0x1);
        bob = address(0x2);

        // Deploy contracts
        usdc = new MockUSDC();
        vault = new LakomiVault(address(usdc), 1000 * 10**6, 48 hours);
        token = new LakomiToken();
        loans = new LakomiLoans(address(token), address(vault));

        // Setup connections
        token.setLakomiLoans(address(loans));
        token.grantRole(token.LOCKER_ROLE(), address(loans));
        token.grantRole(token.BURNER_ROLE(), address(loans));

        // Fund the loans contract with USDC for lending
        usdc.transfer(address(loans), 2000 * 10**6);

        // Give Alice USDC and tokens
        usdc.transfer(alice, 5000 * 10**6);
        token.mint(alice, 1000 * 10**18);

        // Alice deposits to vault
        vm.startPrank(alice);
        usdc.approve(address(vault), CONTRIBUTION);
        vault.deposit(CONTRIBUTION);
        vm.stopPrank();
    }

    // ============================================================
    //                    DEPLOYMENT TESTS
    // ============================================================

    function test_Deployment() public view {
        assertEq(address(loans.token()), address(token));
        assertEq(address(loans.vault()), address(vault));
        assertEq(loans.interestRate(), 500); // 5%
        assertEq(loans.maxLTV(), 5000);       // Legacy default, actual is tiered
        assertEq(loans.collateralRatio(), 2500); // 25%
    }

    // ============================================================
    //                    LOAN REQUEST TESTS
    // ============================================================

    function test_RequestLoan() public {
        uint256 loanAmount = 200 * 10**6; // 200 USDC (under auto-approve threshold)

        vm.prank(alice);
        uint256 loanId = loans.requestLoan(
            loanAmount,
            30 days,
            "Emergency car repair"
        );

        assertEq(loanId, 0);
        assertEq(loans.loanCount(), 1);

        (,,,,,, uint256 startTime,,,,,) = loans.getLoan(loanId);
        assertEq(startTime, 0); // Not yet disbursed
    }

    function test_RequestLoan_AutoApproved() public {
        uint256 loanAmount = 200 * 10**6;

        vm.prank(alice);
        uint256 loanId = loans.requestLoan(loanAmount, 30 days, "Test");

        (,,,,,,,,,, LakomiLoans.LoanStatus status,) = loans.getLoan(loanId);
        assertEq(uint(status), uint(LakomiLoans.LoanStatus.Approved));
    }

    function test_RequestLoan_OverThreshold() public {
        uint256 loanAmount = 300 * 10**6; // Over 200 USDC threshold

        vm.prank(alice);
        uint256 loanId = loans.requestLoan(loanAmount, 30 days, "Test");

        (,,,,,,,,,, LakomiLoans.LoanStatus status,) = loans.getLoan(loanId);
        assertEq(uint(status), uint(LakomiLoans.LoanStatus.Pending)); // Needs approval
    }

    function test_RevertWhen_RequestOverMaxLTV() public {
        uint256 loanAmount = 600 * 10**6; // 60% of contribution (over 50% limit)

        vm.prank(alice);
        vm.expectRevert(LakomiLoans.LakomiLoans__ExceedsMaxLoan.selector);
        loans.requestLoan(loanAmount, 30 days, "Test");
    }

    function test_RevertWhen_RequestWithoutContribution() public {
        vm.prank(bob); // Bob has no contribution
        vm.expectRevert(LakomiLoans.LakomiLoans__ExceedsMaxLoan.selector);
        loans.requestLoan(100 * 10**6, 30 days, "Test");
    }

    function test_RevertWhen_RequestZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(LakomiLoans.LakomiLoans__ZeroAmount.selector);
        loans.requestLoan(0, 30 days, "Test");
    }

    function test_RevertWhen_InvalidDuration() public {
        vm.prank(alice);
        vm.expectRevert(LakomiLoans.LakomiLoans__InvalidDuration.selector);
        loans.requestLoan(100 * 10**6, 0, "Test");

        vm.prank(alice);
        vm.expectRevert(LakomiLoans.LakomiLoans__InvalidDuration.selector);
        loans.requestLoan(100 * 10**6, 400 days, "Test");
    }

    // ============================================================
    //                    DISBURSEMENT TESTS
    // ============================================================

    function test_Disburse() public {
        uint256 loanAmount = 200 * 10**6;

        vm.prank(alice);
        uint256 loanId = loans.requestLoan(loanAmount, 30 days, "Test");

        uint256 aliceBalanceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        loans.disburse(loanId);

        uint256 aliceBalanceAfter = usdc.balanceOf(alice);
        assertEq(aliceBalanceAfter - aliceBalanceBefore, loanAmount);

        // Check collateral locked
        assertEq(token.getLockedBalance(alice), loans.getRequiredCollateral(loanAmount));
    }

    function test_RevertWhen_DisburseNotApproved() public {
        uint256 loanAmount = 300 * 10**6; // Over threshold

        vm.prank(alice);
        uint256 loanId = loans.requestLoan(loanAmount, 30 days, "Test");

        vm.prank(alice);
        vm.expectRevert(LakomiLoans.LakomiLoans__LoanNotApproved.selector);
        loans.disburse(loanId);
    }

    // ============================================================
    //                    REPAYMENT TESTS
    // ============================================================

    function test_RepayPartial() public {
        uint256 loanAmount = 200 * 10**6;

        vm.startPrank(alice);
        uint256 loanId = loans.requestLoan(loanAmount, 30 days, "Test");
        loans.disburse(loanId);

        // Approve USDC for repayment
        usdc.approve(address(loans), 100 * 10**6);

        // Partial repayment
        loans.repay(loanId, 100 * 10**6);
        vm.stopPrank();

        (,,,,,,, uint256 repaidAmount,,,,) = loans.getLoan(loanId);
        assertEq(repaidAmount, 100 * 10**6);
    }

    function test_RepayFull() public {
        uint256 loanAmount = 200 * 10**6;

        vm.startPrank(alice);
        uint256 loanId = loans.requestLoan(loanAmount, 30 days, "Test");
        loans.disburse(loanId);

        // Calculate total owed
        (,,,, uint256 interest,,,,,,,) = loans.getLoan(loanId);
        uint256 totalOwed = loanAmount + interest;

        usdc.approve(address(loans), totalOwed);
        loans.repayInFull(loanId);
        vm.stopPrank();

        (,,,,,,,,,, LakomiLoans.LoanStatus status,) = loans.getLoan(loanId);
        assertEq(uint(status), uint(LakomiLoans.LoanStatus.Repaid));

        // Collateral unlocked
        assertEq(token.getLockedBalance(alice), 0);
    }

    function test_RevertWhen_RepayOverAmount() public {
        uint256 loanAmount = 200 * 10**6;

        vm.startPrank(alice);
        uint256 loanId = loans.requestLoan(loanAmount, 30 days, "Test");
        loans.disburse(loanId);

        (,,,, uint256 interest,,,,,,,) = loans.getLoan(loanId);
        uint256 totalOwed = loanAmount + interest;

        usdc.approve(address(loans), totalOwed * 2);

        vm.expectRevert(LakomiLoans.LakomiLoans__Overpayment.selector);
        loans.repay(loanId, totalOwed * 2);
        vm.stopPrank();
    }

    // ============================================================
    //                    DEFAULT TESTS
    // ============================================================

    function test_MarkDefaulted() public {
        uint256 loanAmount = 200 * 10**6;

        vm.startPrank(alice);
        uint256 loanId = loans.requestLoan(loanAmount, 30 days, "Test");
        loans.disburse(loanId);
        vm.stopPrank();

        // Warp past due date + grace period
        vm.warp(block.timestamp + 30 days + 8 days);

        loans.markDefaulted(loanId);

        (,,,,,,,,,, LakomiLoans.LoanStatus status,) = loans.getLoan(loanId);
        assertEq(uint(status), uint(LakomiLoans.LoanStatus.Defaulted));
    }

    function test_RevertWhen_DefaultBeforeDue() public {
        uint256 loanAmount = 200 * 10**6;

        vm.startPrank(alice);
        uint256 loanId = loans.requestLoan(loanAmount, 30 days, "Test");
        loans.disburse(loanId);
        vm.stopPrank();

        vm.expectRevert(LakomiLoans.LakomiLoans__GracePeriodActive.selector);
        loans.markDefaulted(loanId);
    }

    function test_ClaimCollateral() public {
        uint256 loanAmount = 200 * 10**6;
        uint256 collateral = loans.getRequiredCollateral(loanAmount);

        vm.startPrank(alice);
        uint256 loanId = loans.requestLoan(loanAmount, 30 days, "Test");
        loans.disburse(loanId);
        vm.stopPrank();

        uint256 aliceTokenBalanceBefore = token.balanceOf(alice);

        // Default
        vm.warp(block.timestamp + 30 days + 8 days);
        loans.markDefaulted(loanId);

        // Claim collateral
        loans.claimCollateral(loanId);

        uint256 aliceTokenBalanceAfter = token.balanceOf(alice);
        assertEq(aliceTokenBalanceBefore - aliceTokenBalanceAfter, collateral);
    }

    // ============================================================
    //                    VIEW FUNCTION TESTS
    // ============================================================

    function test_CalculateInterest() public view {
        uint256 principal = 500 * 10**6; // 500 USDC
        uint256 duration = 30 days;

        uint256 interest = loans.calculateInterest(principal, duration);

        // 5% APY for 30 days
        // Interest = 500 * 0.05 * (30/365) ≈ 2.05 USDC
        assertGt(interest, 0);
        assertLt(interest, principal); // Interest should be less than principal
    }

    function test_GetMaxLoanAmount() public view {
        uint256 maxLoan = loans.getMaxLoanAmount(alice);

        // 50% of 1000 USDC contribution = 500 USDC
        assertEq(maxLoan, 500 * 10**6);
    }

    function test_GetRequiredCollateral() public view {
        uint256 loanAmount = 200 * 10**6;
        uint256 collateral = loans.getRequiredCollateral(loanAmount);

        // 25% of 200 USDC = 50 USDC worth of tokens
        assertGt(collateral, 0);
    }

    function test_GetBorrowerLoans() public {
        vm.startPrank(alice);
        uint256 loan1 = loans.requestLoan(100 * 10**6, 30 days, "Test1");
        uint256 loan2 = loans.requestLoan(100 * 10**6, 30 days, "Test2");
        vm.stopPrank();

        uint256[] memory borrowerLoans = loans.getBorrowerLoans(alice);
        assertEq(borrowerLoans.length, 2);
        assertEq(borrowerLoans[0], loan1);
        assertEq(borrowerLoans[1], loan2);
    }

    // ============================================================
    //                    ADMIN TESTS
    // ============================================================

    function test_SetInterestRate() public {
        loans.setInterestRate(300); // 3%
        assertEq(loans.interestRate(), 300);
    }

    function test_SetMaxLTV() public {
        loans.setMaxLTV(6000); // 60%
        assertEq(loans.maxLTV(), 6000);
    }

    function test_SetCollateralRatio() public {
        loans.setCollateralRatio(3000); // 30%
        assertEq(loans.collateralRatio(), 3000);
    }

    function test_SetAutoApproveThreshold() public {
        loans.setAutoApproveThreshold(500 * 10**6);
        assertEq(loans.autoApproveThreshold(), 500 * 10**6);
    }

    function test_Pause() public {
        loans.pause();

        vm.prank(alice);
        vm.expectRevert();
        loans.requestLoan(100 * 10**6, 30 days, "Test");
    }

    // ============================================================
    //                  TIERED LTV TESTS
    // ============================================================

    function test_TieredLTV_Tier1() public {
        // Bob has no deposit = Tier 1 (30% LTV)
        // Give bob some USDC and deposit small amount (under 500 USDC)
        usdc.transfer(bob, 100 * 10**6);
        vm.prank(bob);
        usdc.approve(address(vault), 100 * 10**6);
        vm.prank(bob);
        vault.deposit(100 * 10**6);

        // Admin mints tokens to bob for collateral
        token.mint(bob, 1000 * 10**18);

        uint256 maxLoan = loans.getMaxLoanAmount(bob);
        // Tier 1: 30% of 100 USDC = 30 USDC
        assertEq(maxLoan, 30 * 10**6);
    }

    function test_TieredLTV_Tier2() public {
        // Alice has 1000 USDC deposit = Tier 2 (50% LTV)
        uint256 maxLoan = loans.getMaxLoanAmount(alice);
        // Tier 2: 50% of 1000 USDC = 500 USDC
        assertEq(maxLoan, 500 * 10**6);
    }

    function test_TieredLTV_Tier3() public {
        // Give alice enough for Tier 3 (2000+ USDC)
        usdc.transfer(alice, 2000 * 10**6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 2000 * 10**6);
        vault.deposit(2000 * 10**6);
        vm.stopPrank();

        uint256 maxLoan = loans.getMaxLoanAmount(alice);
        // Tier 3: 70% of 3000 USDC = 2100 USDC
        assertEq(maxLoan, 2100 * 10**6);
    }

    function test_RevertWhen_RequestOverTierMaxLTV() public {
        // Alice: Tier 2 (1000 USDC deposit) = 50% LTV = max 500 USDC
        // Try to request 550 USDC (55%)
        vm.prank(alice);
        vm.expectRevert(LakomiLoans.LakomiLoans__ExceedsMaxLoan.selector);
        loans.requestLoan(550 * 10**6, 30 days, "Test");
    }
}
