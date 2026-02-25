// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/LakomiToken.sol";
import "../src/LakomiVault.sol";
import "../src/LakomiGovern.sol";
import "../src/LakomiLoans.sol";
import "../src/LakomiCare.sol";

/**
 * @title DeployBaseSepolia
 * @notice Deploys Lakomi contracts to Base Sepolia testnet
 * @dev Run: source .env && forge script script/DeployBaseSepolia.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployBaseSepolia is Script {
    // Configuration
    uint256 constant WITHDRAWAL_THRESHOLD = 1000 * 10**6; // 1000 USDC (6 decimals)
    uint256 constant TIMELOCK = 48 hours;
    uint256 constant VOTING_PERIOD = 7 days;
    uint256 constant QUORUM = 40; // 40%

    function run() external {
        // Base Sepolia USDC address (Circle official testnet)
        address usdcAddress = 0x036Cbd53842C5426634e7929541CE2317F934467;

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        console.log("=== DEPLOYING LAKOMI TO BASE SEPOLIA ===");
        console.log("Deployer:", deployer);
        console.log("USDC Address:", usdcAddress);

        // 1. Deploy LakomiVault
        LakomiVault vault = new LakomiVault(
            usdcAddress,
            WITHDRAWAL_THRESHOLD,
            TIMELOCK
        );
        console.log("LakomiVault:", address(vault));

        // 2. Deploy LakomiToken
        LakomiToken token = new LakomiToken();
        console.log("LakomiToken:", address(token));

        // 3. Deploy LakomiGovern
        LakomiGovern govern = new LakomiGovern(
            address(token),
            VOTING_PERIOD,
            QUORUM,
            TIMELOCK
        );
        console.log("LakomiGovern:", address(govern));

        // 4. Deploy LakomiLoans
        LakomiLoans loans = new LakomiLoans(
            address(token),
            address(vault)
        );
        console.log("LakomiLoans:", address(loans));

        // 5. Deploy LakomiCare
        LakomiCare care = new LakomiCare(address(vault));
        console.log("LakomiCare:", address(care));

        console.log("");
        console.log("=== CONFIGURING CONNECTIONS ===");

        // Configure LakomiToken
        token.setLakomiVault(address(vault));
        token.setLakomiGovern(address(govern));
        token.setLakomiLoans(address(loans));
        token.grantRole(token.LOCKER_ROLE(), address(loans));
        token.grantRole(token.BURNER_ROLE(), address(loans));
        console.log("Token configured");

        // Configure LakomiVault
        vault.grantRole(vault.GOVERN_ROLE(), address(govern));
        vault.grantRole(vault.GOVERN_ROLE(), address(care));
        console.log("Vault configured");

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("");
        console.log("Deployed Addresses:");
        console.log("-------------------");
        console.log("USDC (existing):", usdcAddress);
        console.log("LakomiVault:  ", address(vault));
        console.log("LakomiToken:  ", address(token));
        console.log("LakomiGovern: ", address(govern));
        console.log("LakomiLoans:  ", address(loans));
        console.log("LakomiCare:   ", address(care));

        vm.stopBroadcast();
    }
}
