// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {SecondaryMarketPlace} from "src/SecondaryMarketPlace.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title UpgradeSecondaryMarketPlace
 * @notice Upgrade SecondaryMarketPlace to add vUSD/ERC20 payment support
 * 
 * Usage:
 *   export PRIVATE_KEY=0x...
 *   
 *   # Dry run
 *   forge script script/UpgradeSecondaryMarketPlace.s.sol --rpc-url $RPC_URL -vvvv
 *   
 *   # Production
 *   forge script script/UpgradeSecondaryMarketPlace.s.sol --rpc-url $RPC_URL --broadcast --verify -vvvv
 */
contract UpgradeSecondaryMarketPlace is Script {
    // Base Sepolia (84532)
    address constant SECONDARY_PROXY = 0x7C2fFdF9b2A5431D9a77F39C5E5Be2FCdCdD245f;
    
    // vUSD token on Base Sepolia
    address constant VUSD_TOKEN = 0x2c692aD1BF4a3A3ac8C747248524B165Af95f6e2;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("SecondaryMarketPlace Upgrade - vUSD Support");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Proxy:", SECONDARY_PROXY);
        console.log("vUSD Token:", VUSD_TOKEN);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new implementation
        console.log("Deploying new SecondaryMarketPlace implementation...");
        SecondaryMarketPlace newImpl = new SecondaryMarketPlace();
        console.log("New implementation:", address(newImpl));

        // Upgrade proxy
        console.log("Upgrading proxy...");
        UUPSUpgradeable proxy = UUPSUpgradeable(SECONDARY_PROXY);
        proxy.upgradeToAndCall(address(newImpl), "");
        console.log("Upgrade complete!");

        // Set payment token to vUSD
        console.log("Setting payment token to vUSD...");
        SecondaryMarketPlace(SECONDARY_PROXY).setPaymentToken(VUSD_TOKEN);
        console.log("Payment token set!");

        vm.stopBroadcast();

        console.log("");
        console.log("==============================================");
        console.log("UPGRADE COMPLETE");
        console.log("==============================================");
        console.log("SecondaryMarketPlace now uses vUSD for payments");
        console.log("");
        console.log("Verify with:");
        console.log("  cast call", SECONDARY_PROXY);
        console.log('  "paymentToken()(address)" --rpc-url $RPC_URL');
    }
}
