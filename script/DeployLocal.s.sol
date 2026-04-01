// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/LakomiToken.sol";
import "../src/LakomiVault.sol";
import "../src/LakomiGovern.sol";
import "../src/LakomiLoans.sol";
import "../src/mocks/MockUSDC.sol";

/**
 * @title DeployLocal
 * @notice Deploys Lakomi contracts to local Anvil for testing
 * @dev Run: forge script script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e72db11a0012bf4f44fb4a48f43f2fd3a8f199bd49d4ddb24 --broadcast
 */
contract DeployLocal is Script {
    // Configuration
    uint256 constant WITHDRAWAL_THRESHOLD = 1000 * 10**6; // 1000 USDC
    uint256 constant TIMELOCK = 48 hours;
    uint256 constant VOTING_PERIOD = 7 days;
    uint256 constant QUORUM = 40; // 40%

    function run() external {
        // Default Anvil private key (account 0)
        uint256 deployerPrivateKey = 0xac0974bec39a17e72db11a0012bf4f44fb4a48f43f2fd3a8f199bd49d4ddb24;
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        console.log("=== DEPLOYING LAKOMI TO LOCAL ANVIL ===");
        console.log("Deployer:", deployer);

        // 1. Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC:", address(usdc));

        // 2. Deploy LakomiVault
        LakomiVault vault = new LakomiVault(
            address(usdc),
            WITHDRAWAL_THRESHOLD,
            TIMELOCK
        );
        console.log("LakomiVault:", address(vault));

        // 3. Deploy LakomiToken
        LakomiToken token = new LakomiToken();
        console.log("LakomiToken:", address(token));

        // 4. Deploy LakomiGovern
        LakomiGovern govern = new LakomiGovern(
            address(token),
            VOTING_PERIOD,
            QUORUM,
            TIMELOCK
        );
        console.log("LakomiGovern:", address(govern));

        // 5. Deploy LakomiLoans
        LakomiLoans loans = new LakomiLoans(
            address(token),
            address(vault)
        );
        console.log("LakomiLoans:", address(loans));

        console.log("");
        console.log("=== CONFIGURING CONNECTIONS ===");

        // Configure LakomiToken
        token.setLakomiVault(address(vault));
        token.setLakomiGovern(address(govern));
        token.setLakomiLoans(address(loans));
        token.grantRole(token.LOCKER_ROLE(), address(loans));
        token.grantRole(token.BURNER_ROLE(), address(loans));
        token.grantRole(token.MEMBERSHIP_ROLE(), address(govern));
        console.log("Token connections configured");

        // Configure LakomiVault
        vault.grantRole(vault.GOVERN_ROLE(), address(govern));
        console.log("Vault configured");

        console.log("");
        console.log("=== FUNDING FOR TESTING ===");

        // Mint USDC to deployer
        usdc.mint(deployer, 15000 * 10**6);
        console.log("Minted 15000 USDC to deployer");

        // Fund Loans contract with USDC
        usdc.transfer(address(loans), 2000 * 10**6);
        console.log("Funded Loans with 2000 USDC");

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("");
        console.log("Deployed Addresses:");
        console.log("-------------------");
        console.log("MockUSDC:   ", address(usdc));
        console.log("LakomiVault:", address(vault));
        console.log("LakomiToken:", address(token));
        console.log("LakomiGovern:", address(govern));
        console.log("LakomiLoans: ", address(loans));

        vm.stopBroadcast();
    }
}
