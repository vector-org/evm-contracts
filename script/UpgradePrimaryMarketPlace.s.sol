// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PrimaryMarketPlace} from "src/PrimaryMarketPlace.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title UpgradePrimaryMarketPlace
 * @notice Upgrade PrimaryMarketPlace for Steam Legacy feature (adminMintTo)
 * 
 * Usage:
 *   export PRIVATE_KEY=0x...
 *   
 *   # Dry run
 *   forge script script/UpgradePrimaryMarketPlace.s.sol --rpc-url $RPC_URL -vvvv
 *   
 *   # Production
 *   forge script script/UpgradePrimaryMarketPlace.s.sol --rpc-url $RPC_URL --broadcast --verify -vvvv
 */
contract UpgradePrimaryMarketPlace is Script {
    // Base Sepolia (84532)
    address constant PRIMARY_PROXY = 0x49A5FD51FF4Cb5Fd648B5485e349D2fac03BEABd;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("PrimaryMarketPlace Upgrade - Steam Legacy");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Proxy:", PRIMARY_PROXY);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new implementation
        console.log("Deploying new PrimaryMarketPlace implementation...");
        PrimaryMarketPlace newImpl = new PrimaryMarketPlace();
        console.log("New implementation:", address(newImpl));

        // Upgrade proxy
        console.log("Upgrading proxy...");
        UUPSUpgradeable proxy = UUPSUpgradeable(PRIMARY_PROXY);
        proxy.upgradeToAndCall(address(newImpl), "");
        console.log("Upgrade complete!");

        vm.stopBroadcast();

        console.log("");
        console.log("===========================================");
        console.log("NEXT STEP: Set mint authority");
        console.log("===========================================");
        console.log("Run:");
        console.log("  cast send", PRIMARY_PROXY);
        console.log('  "setMintAuthority(address)" <BACKEND_WALLET>');
        console.log("  --private-key $PRIVATE_KEY --rpc-url $RPC_URL");
    }
}
