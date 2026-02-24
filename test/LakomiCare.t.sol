// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LakomiToken.sol";
import "../src/LakomiVault.sol";
import "../src/LakomiCare.sol";
import "../src/mocks/MockUSDC.sol";

contract LakomiCareTest is Test {
    LakomiToken public token;
    LakomiVault public vault;
    LakomiCare public care;
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
        care = new LakomiCare(address(vault));
        token = new LakomiToken();

        // Grant care contract permission to spend from vault
        vault.grantRole(vault.GOVERN_ROLE(), address(care));

        // Fund the care contract with USDC for payouts
        usdc.transfer(address(care), 10000 * 10**6);

        // Give Alice USDC
        usdc.transfer(alice, 5000 * 10**6);

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
        assertEq(address(care.vault()), address(vault));
        assertEq(care.processingTime(), 24 hours);
        assertEq(care.maxTotalPayout(), 5000 * 10**6);
    }

    function test_BenefitTypesInitialized() public view {
        // Medical
        (
            string memory name,
            bool enabled,
            uint256 maxAmount,
            uint256 annualLimit,
            uint256 coolingOff,
            bool verificationRequired
        ) = care.getBenefitType(LakomiCare.BenefitCategory.Medical);

        assertEq(name, "Medical Emergency");
        assertTrue(enabled);
        assertEq(maxAmount, 3000 * 10**6);
        assertEq(annualLimit, 5000 * 10**6);
        assertEq(coolingOff, 90 days);
        assertFalse(verificationRequired);
    }

    // ============================================================
    //                    CLAIM SUBMISSION TESTS
    // ============================================================

    function test_SubmitClaim() public {
        vm.prank(alice);
        uint256 claimId = care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            1000 * 10**6,
            "ipfs://QmTestHash",
            "Emergency room visit"
        );

        assertEq(claimId, 0);
        assertEq(care.claimCount(), 1);
    }

    function test_SubmitClaim_AutoApproved() public {
        // Medical doesn't require verification
        vm.prank(alice);
        uint256 claimId = care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            1000 * 10**6,
            "ipfs://QmTestHash",
            "Test"
        );

        (,,,,,,, LakomiCare.ClaimStatus status,) = care.getClaim(claimId);
        assertEq(uint(status), uint(LakomiCare.ClaimStatus.Approved));
    }

    function test_SubmitClaim_RequiresApproval() public {
        // Unemployment requires verification
        vm.prank(alice);
        uint256 claimId = care.submitClaim(
            LakomiCare.BenefitCategory.Unemployment,
            500 * 10**6,
            "ipfs://QmTestHash",
            "Job loss"
        );

        (,,,,,,, LakomiCare.ClaimStatus status,) = care.getClaim(claimId);
        assertEq(uint(status), uint(LakomiCare.ClaimStatus.Pending));
    }

    function test_RevertWhen_ClaimZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(LakomiCare.LakomiCare__ZeroAmount.selector);
        care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            0,
            "ipfs://QmTestHash",
            "Test"
        );
    }

    function test_RevertWhen_ClaimOverMaxAmount() public {
        vm.prank(alice);
        vm.expectRevert(LakomiCare.LakomiCare__ExceedsMaxAmount.selector);
        care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            4000 * 10**6, // Over 3000 max
            "ipfs://QmTestHash",
            "Test"
        );
    }

    function test_RevertWhen_ClaimWithoutContribution() public {
        vm.prank(bob); // Bob has no contribution
        vm.expectRevert(LakomiCare.LakomiCare__NotMember.selector);
        care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            100 * 10**6,
            "ipfs://QmTestHash",
            "Test"
        );
    }

    // ============================================================
    //                    ANNUAL LIMIT TESTS
    // ============================================================

    function test_RevertWhen_ExceedsAnnualLimit() public {
        // Medical annual limit is 5000 USDC
        vm.startPrank(alice);

        // Claim 3000 first
        uint256 claim1 = care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            3000 * 10**6,
            "ipfs://QmTest1",
            "Test1"
        );
        care.processClaim(claim1);

        // Try to claim 3000 more (should fail - only 2000 left)
        vm.expectRevert(LakomiCare.LakomiCare__ExceedsAnnualLimit.selector);
        care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            3000 * 10**6,
            "ipfs://QmTest2",
            "Test2"
        );
        vm.stopPrank();
    }

    function test_ClaimWithinAnnualLimit() public {
        vm.startPrank(alice);

        // Claim 3000 first
        uint256 claim1 = care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            3000 * 10**6,
            "ipfs://QmTest1",
            "Test1"
        );
        care.processClaim(claim1);

        // Warp past cooling-off period (90 days)
        vm.warp(block.timestamp + 91 days);

        // Claim 2000 more (exactly at limit)
        uint256 claim2 = care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            2000 * 10**6,
            "ipfs://QmTest2",
            "Test2"
        );

        (,,,,,,, LakomiCare.ClaimStatus status,) = care.getClaim(claim2);
        assertEq(uint(status), uint(LakomiCare.ClaimStatus.Approved));
        vm.stopPrank();
    }

    // ============================================================
    //                    COOLING OFF TESTS
    // ============================================================

    function test_RevertWhen_CoolingOffNotMet() public {
        vm.startPrank(alice);

        // First claim
        uint256 claim1 = care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            1000 * 10**6,
            "ipfs://QmTest1",
            "Test1"
        );
        care.processClaim(claim1);

        // Try second claim immediately (90 day cooling off)
        vm.expectRevert(LakomiCare.LakomiCare__CoolingOffNotMet.selector);
        care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            1000 * 10**6,
            "ipfs://QmTest2",
            "Test2"
        );
        vm.stopPrank();
    }

    function test_ClaimAfterCoolingOff() public {
        vm.startPrank(alice);

        // First claim
        uint256 claim1 = care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            1000 * 10**6,
            "ipfs://QmTest1",
            "Test1"
        );
        care.processClaim(claim1);

        // Warp past cooling off (90 days)
        vm.warp(block.timestamp + 91 days);

        // Second claim should succeed
        uint256 claim2 = care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            1000 * 10**6,
            "ipfs://QmTest2",
            "Test2"
        );

        (,,,,,,, LakomiCare.ClaimStatus status,) = care.getClaim(claim2);
        assertEq(uint(status), uint(LakomiCare.ClaimStatus.Approved));
        vm.stopPrank();
    }

    // ============================================================
    //                    APPROVAL/REJECTION TESTS
    // ============================================================

    function test_ApproveClaim() public {
        vm.prank(alice);
        uint256 claimId = care.submitClaim(
            LakomiCare.BenefitCategory.Unemployment, // Requires verification
            500 * 10**6,
            "ipfs://QmTest",
            "Test"
        );

        care.approveClaim(claimId);

        (,,,,,,, LakomiCare.ClaimStatus status,) = care.getClaim(claimId);
        assertEq(uint(status), uint(LakomiCare.ClaimStatus.Approved));
    }

    function test_RejectClaim() public {
        vm.prank(alice);
        uint256 claimId = care.submitClaim(
            LakomiCare.BenefitCategory.Unemployment,
            500 * 10**6,
            "ipfs://QmTest",
            "Test"
        );

        care.rejectClaim(claimId, "Insufficient documentation");

        (,,,,,,, LakomiCare.ClaimStatus status, string memory reason) = care.getClaim(claimId);
        assertEq(uint(status), uint(LakomiCare.ClaimStatus.Rejected));
        assertEq(reason, "Insufficient documentation");
    }

    // ============================================================
    //                    PAYOUT TESTS
    // ============================================================

    function test_ProcessClaim() public {
        uint256 claimAmount = 1000 * 10**6;

        vm.startPrank(alice);
        uint256 claimId = care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            claimAmount,
            "ipfs://QmTest",
            "Test"
        );

        uint256 balanceBefore = usdc.balanceOf(alice);
        care.processClaim(claimId);
        uint256 balanceAfter = usdc.balanceOf(alice);
        vm.stopPrank();

        assertEq(balanceAfter - balanceBefore, claimAmount);

        (,,,,,,, LakomiCare.ClaimStatus status,) = care.getClaim(claimId);
        assertEq(uint(status), uint(LakomiCare.ClaimStatus.Paid));
    }

    function test_RevertWhen_ProcessNotApproved() public {
        vm.prank(alice);
        uint256 claimId = care.submitClaim(
            LakomiCare.BenefitCategory.Unemployment, // Pending, not approved
            500 * 10**6,
            "ipfs://QmTest",
            "Test"
        );

        vm.expectRevert(LakomiCare.LakomiCare__AlreadyProcessed.selector);
        care.processClaim(claimId);
    }

    // ============================================================
    //                    ELIGIBILITY CHECK TESTS
    // ============================================================

    function test_CheckEligibility_Eligible() public view {
        (bool eligible, uint256 remaining, uint256 cooldown) =
            care.checkEligibility(alice, LakomiCare.BenefitCategory.Medical);

        assertTrue(eligible);
        assertEq(remaining, 5000 * 10**6); // Full annual limit
        assertEq(cooldown, 0);
    }

    function test_CheckEligibility_AfterClaim() public {
        vm.startPrank(alice);
        uint256 claimId = care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            1000 * 10**6,
            "ipfs://QmTest",
            "Test"
        );
        care.processClaim(claimId);
        vm.stopPrank();

        (bool eligible, uint256 remaining, uint256 cooldown) =
            care.checkEligibility(alice, LakomiCare.BenefitCategory.Medical);

        assertFalse(eligible); // Not eligible due to cooldown
        assertEq(remaining, 4000 * 10**6); // 5000 - 1000
        assertGt(cooldown, 0);
    }

    // ============================================================
    //                    VIEW FUNCTION TESTS
    // ============================================================

    function test_GetMemberClaims() public {
        vm.startPrank(alice);
        uint256 claim1 = care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            500 * 10**6,
            "ipfs://QmTest1",
            "Test1"
        );
        uint256 claim2 = care.submitClaim(
            LakomiCare.BenefitCategory.Education,
            500 * 10**6,
            "ipfs://QmTest2",
            "Test2"
        );
        vm.stopPrank();

        uint256[] memory claims = care.getMemberClaims(alice);
        assertEq(claims.length, 2);
        assertEq(claims[0], claim1);
        assertEq(claims[1], claim2);
    }

    // ============================================================
    //                    ADMIN TESTS
    // ============================================================

    function test_UpdateBenefitType() public {
        care.updateBenefitType(
            LakomiCare.BenefitCategory.Medical,
            true,
            4000 * 10**6,  // New max
            6000 * 10**6,  // New annual limit
            60 days,       // New cooling off
            false
        );

        (, bool enabled, uint256 maxAmount, uint256 annualLimit, uint256 coolingOff,) =
            care.getBenefitType(LakomiCare.BenefitCategory.Medical);

        assertEq(maxAmount, 4000 * 10**6);
        assertEq(annualLimit, 6000 * 10**6);
        assertEq(coolingOff, 60 days);
    }

    function test_SetProcessingTime() public {
        care.setProcessingTime(48 hours);
        assertEq(care.processingTime(), 48 hours);
    }

    function test_SetMaxTotalPayout() public {
        care.setMaxTotalPayout(10_000 * 10**6);
        assertEq(care.maxTotalPayout(), 10_000 * 10**6);
    }

    function test_Pause() public {
        care.pause();

        vm.prank(alice);
        vm.expectRevert();
        care.submitClaim(
            LakomiCare.BenefitCategory.Medical,
            100 * 10**6,
            "ipfs://QmTest",
            "Test"
        );
    }
}
