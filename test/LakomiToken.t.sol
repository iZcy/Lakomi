// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LakomiToken.sol";

contract LakomiTokenTest is Test {
    LakomiToken public token;
    address public admin;
    address public alice;
    address public bob;

    function setUp() public {
        admin = address(this);
        alice = address(0x1);
        bob = address(0x2);

        token = new LakomiToken();
    }

    // ============================================================
    //                    DEPLOYMENT TESTS
    // ============================================================

    function test_Deployment() public view {
        assertEq(token.name(), "Lakomi Token");
        assertEq(token.symbol(), "LAK");
        assertEq(token.decimals(), 18);
        assertEq(token.MAX_SUPPLY(), 1_000_000 * 10**18);
        assertTrue(token.transfersEnabled());
        assertEq(token.totalSupply(), 0);
    }

    function test_AdminHasRoles() public view {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(token.hasRole(token.MINTER_ROLE(), admin));
        assertTrue(token.hasRole(token.BURNER_ROLE(), admin));
    }

    // ============================================================
    //                    MINTING TESTS
    // ============================================================

    function test_Mint() public {
        token.mint(alice, 100 * 10**18);

        assertEq(token.balanceOf(alice), 100 * 10**18);
        assertEq(token.totalSupply(), 100 * 10**18);
    }

    function test_MintDefault() public {
        token.mintDefault(alice);

        assertEq(token.balanceOf(alice), token.DEFAULT_MINT_AMOUNT());
    }

    function test_RevertWhen_MintToZeroAddress() public {
        vm.expectRevert(LakomiToken.LakomiToken__ZeroAddress.selector);
        token.mint(address(0), 100 * 10**18);
    }

    function test_RevertWhen_MintExceedsMaxSupply() public {
        uint256 maxSupply = token.MAX_SUPPLY();
        vm.expectRevert(LakomiToken.LakomiToken__ExceedsMaxSupply.selector);
        token.mint(alice, maxSupply + 1);
    }

    function test_RevertWhen_UnauthorizedMint() public {
        vm.prank(alice);
        vm.expectRevert();
        token.mint(bob, 100 * 10**18);
    }

    // ============================================================
    //                    BURNING TESTS
    // ============================================================

    function test_Burn() public {
        token.mint(alice, 100 * 10**18);

        token.burn(alice, 50 * 10**18);

        assertEq(token.balanceOf(alice), 50 * 10**18);
        assertEq(token.totalSupply(), 50 * 10**18);
    }

    function test_RevertWhen_BurnInsufficientBalance() public {
        token.mint(alice, 50 * 10**18);

        vm.expectRevert(LakomiToken.LakomiToken__InsufficientBalance.selector);
        token.burn(alice, 100 * 10**18);
    }

    // ============================================================
    //                    LOCKING TESTS
    // ============================================================

    function test_LockTokens() public {
        token.mint(alice, 100 * 10**18);

        // Grant locker role
        token.grantRole(token.LOCKER_ROLE(), admin);

        token.lockTokens(alice, 25 * 10**18);

        assertEq(token.getLockedBalance(alice), 25 * 10**18);
        assertEq(token.getAvailableBalance(alice), 75 * 10**18);
    }

    function test_UnlockTokens() public {
        token.mint(alice, 100 * 10**18);
        token.grantRole(token.LOCKER_ROLE(), admin);

        token.lockTokens(alice, 25 * 10**18);
        token.unlockTokens(alice, 25 * 10**18);

        assertEq(token.getLockedBalance(alice), 0);
        assertEq(token.getAvailableBalance(alice), 100 * 10**18);
    }

    function test_RevertWhen_LockInsufficientUnlocked() public {
        token.mint(alice, 50 * 10**18);
        token.grantRole(token.LOCKER_ROLE(), admin);

        vm.expectRevert(LakomiToken.LakomiToken__InsufficientUnlockedTokens.selector);
        token.lockTokens(alice, 100 * 10**18);
    }

    // ============================================================
    //                    TRANSFER TESTS
    // ============================================================

    function test_Transfer() public {
        token.mint(alice, 100 * 10**18);

        vm.prank(alice);
        token.transfer(bob, 50 * 10**18);

        assertEq(token.balanceOf(alice), 50 * 10**18);
        assertEq(token.balanceOf(bob), 50 * 10**18);
    }

    function test_RevertWhen_TransferLockedTokens() public {
        token.mint(alice, 100 * 10**18);
        token.grantRole(token.LOCKER_ROLE(), admin);
        token.lockTokens(alice, 75 * 10**18);

        vm.prank(alice);
        vm.expectRevert(LakomiToken.LakomiToken__InsufficientUnlockedTokens.selector);
        token.transfer(bob, 50 * 10**18);
    }

    function test_RevertWhen_TransfersDisabled() public {
        token.mint(alice, 100 * 10**18);
        token.setTransfersEnabled(false);

        vm.prank(alice);
        vm.expectRevert(LakomiToken.LakomiToken__TransfersDisabled.selector);
        token.transfer(bob, 50 * 10**18);
    }

    function test_SetTransfersEnabled() public {
        token.setTransfersEnabled(false);
        assertFalse(token.transfersEnabled());

        token.setTransfersEnabled(true);
        assertTrue(token.transfersEnabled());
    }

    // ============================================================
    //                MEMBERSHIP REGISTRY TESTS
    // ============================================================

    function test_RegisterMember() public {
        token.grantRole(token.MEMBERSHIP_ROLE(), admin);

        token.registerMember(alice);

        assertTrue(token.isRegisteredMember(alice));
        assertEq(token.memberCount(), 1);
        assertEq(token.getMemberCount(), 1);
        // Should mint default tokens
        assertEq(token.balanceOf(alice), token.DEFAULT_MINT_AMOUNT());
    }

    function test_RegisterMultipleMembers() public {
        token.grantRole(token.MEMBERSHIP_ROLE(), admin);

        token.registerMember(alice);
        token.registerMember(bob);

        assertEq(token.getMemberCount(), 2);
    }

    function test_RevertWhen_RegisterTwice() public {
        token.grantRole(token.MEMBERSHIP_ROLE(), admin);

        token.registerMember(alice);

        vm.expectRevert("Already registered");
        token.registerMember(alice);
    }

    function test_RevertWhen_RegisterZeroAddress() public {
        token.grantRole(token.MEMBERSHIP_ROLE(), admin);

        vm.expectRevert(LakomiToken.LakomiToken__ZeroAddress.selector);
        token.registerMember(address(0));
    }

    function test_RevokeMembership() public {
        token.grantRole(token.MEMBERSHIP_ROLE(), admin);

        token.registerMember(alice);
        assertEq(token.getMemberCount(), 1);

        token.revokeMembership(alice);

        assertFalse(token.isRegisteredMember(alice));
        assertEq(token.getMemberCount(), 0);
        // Should burn all tokens
        assertEq(token.balanceOf(alice), 0);
    }

    function test_RevertWhen_RevokeNonMember() public {
        token.grantRole(token.MEMBERSHIP_ROLE(), admin);

        vm.expectRevert("Not a member");
        token.revokeMembership(alice);
    }

    function test_RevertWhen_UnauthorizedRegister() public {
        vm.prank(alice);
        vm.expectRevert();
        token.registerMember(bob);
    }

    function test_GetVotingPower() public {
        token.grantRole(token.MEMBERSHIP_ROLE(), admin);

        // Not registered = 0 voting power
        assertEq(token.getVotingPower(alice), 0);

        // Registered = 1 voting power
        token.registerMember(alice);
        assertEq(token.getVotingPower(alice), 1);
    }

    // ============================================================
    //                    ADMIN TESTS
    // ============================================================

    function test_SetLakomiVault() public {
        token.setLakomiVault(alice);
        assertEq(token.lakomiVault(), alice);
    }

    function test_RevertWhen_SetLakomiVaultTwice() public {
        token.setLakomiVault(alice);

        vm.expectRevert(LakomiToken.LakomiToken__AlreadySet.selector);
        token.setLakomiVault(bob);
    }

    function test_SetLakomiGovern() public {
        token.setLakomiGovern(alice);
        assertEq(token.lakomiGovern(), alice);
    }

    function test_SetLakomiLoans() public {
        token.setLakomiLoans(alice);
        assertEq(token.lakomiLoans(), alice);
    }

    // ============================================================
    //                    FUZZ TESTS
    // ============================================================

    function testFuzz_Mint(uint256 amount) public {
        amount = bound(amount, 1, token.MAX_SUPPLY());

        token.mint(alice, amount);
        assertEq(token.balanceOf(alice), amount);
    }

    function testFuzz_LockAndUnlock(uint256 mintAmount, uint256 lockAmount) public {
        mintAmount = bound(mintAmount, 100 * 10**18, token.MAX_SUPPLY());
        lockAmount = bound(lockAmount, 1, mintAmount);

        token.mint(alice, mintAmount);
        token.grantRole(token.LOCKER_ROLE(), admin);

        token.lockTokens(alice, lockAmount);
        assertEq(token.getLockedBalance(alice), lockAmount);

        token.unlockTokens(alice, lockAmount);
        assertEq(token.getLockedBalance(alice), 0);
    }
}
