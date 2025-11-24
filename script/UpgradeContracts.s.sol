// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LicenseFactory} from "src/LicenseFactory.sol";
import {PrimaryMarketPlace} from "src/PrimaryMarketPlace.sol";
import {SecondaryMarketPlace} from "src/SecondaryMarketPlace.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title UpgradeContracts
 * @notice Script to upgrade UUPS proxy contracts to new implementations
 * @dev Only upgrades LicenseFactory in this PR (others unchanged)
 * 
 * Usage:
 *   export PRIVATE_KEY=0x...
 *   export RPC_URL=<your-rpc-url>
 *   
 *   # Dry run (simulation)
 *   forge script script/UpgradeContracts.s.sol:UpgradeContracts --rpc-url $RPC_URL -vvvv
 *   
 *   # Actual upgrade (PRODUCTION)
 *   forge script script/UpgradeContracts.s.sol:UpgradeContracts --rpc-url $RPC_URL --broadcast --verify -vvvv
 */
contract UpgradeContracts is Script {
    // Deployed proxy addresses
    address constant FACTORY_PROXY = 0x2C7548B2BBecF649976D4eEe6c0Ff586fab444b7;
    address constant PRIMARY_PROXY = 0x8bFef9D303DB1EcE5Ed9B5Bdb39521f608fcf182;
    address constant SECONDARY_PROXY = 0x5AeBe1d988e556eEc0D74E009E9831CEE70B988F;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("UUPS Contract Upgrade Script");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy new LicenseFactory implementation
        console.log("Step 1: Deploying new LicenseFactory implementation...");
        LicenseFactory newFactoryImpl = new LicenseFactory();
        console.log("New LicenseFactory implementation:", address(newFactoryImpl));
        console.log("");

        // Step 2: Upgrade LicenseFactory proxy
        console.log("Step 2: Upgrading LicenseFactory proxy...");
        console.log("Proxy address:", FACTORY_PROXY);
        
        UUPSUpgradeable factoryProxy = UUPSUpgradeable(FACTORY_PROXY);
        factoryProxy.upgradeToAndCall(
            address(newFactoryImpl),
            "" // No initialization call needed
        );
        console.log("LicenseFactory upgraded successfully!");
        console.log("");

        // Optional: Deploy new PrimaryMarketPlace implementation (if needed)
        // Uncomment if PrimaryMarketPlace has changes
        /*
        console.log("Step 3: Deploying new PrimaryMarketPlace implementation...");
        PrimaryMarketPlace newPrimaryImpl = new PrimaryMarketPlace();
        console.log("New PrimaryMarketPlace implementation:", address(newPrimaryImpl));
        
        console.log("Step 4: Upgrading PrimaryMarketPlace proxy...");
        UUPSUpgradeable primaryProxy = UUPSUpgradeable(PRIMARY_PROXY);
        primaryProxy.upgradeToAndCall(address(newPrimaryImpl), "");
        console.log("PrimaryMarketPlace upgraded successfully!");
        console.log("");
        */

        // Optional: Deploy new SecondaryMarketPlace implementation (if needed)
        // Uncomment if SecondaryMarketPlace has changes
        /*
        console.log("Step 5: Deploying new SecondaryMarketPlace implementation...");
        SecondaryMarketPlace newSecondaryImpl = new SecondaryMarketPlace();
        console.log("New SecondaryMarketPlace implementation:", address(newSecondaryImpl));
        
        console.log("Step 6: Upgrading SecondaryMarketPlace proxy...");
        UUPSUpgradeable secondaryProxy = UUPSUpgradeable(SECONDARY_PROXY);
        secondaryProxy.upgradeToAndCall(address(newSecondaryImpl), "");
        console.log("SecondaryMarketPlace upgraded successfully!");
        console.log("");
        */

        vm.stopBroadcast();

        console.log("===========================================");
        console.log("Upgrade Complete!");
        console.log("===========================================");
        console.log("");
        console.log("Verification:");
        console.log("- LicenseFactory proxy:", FACTORY_PROXY);
        console.log("- New implementation:", address(newFactoryImpl));
        console.log("");
        console.log("Next steps:");
        console.log("1. Verify implementation contract on block explorer");
        console.log("2. Test new functions (changeLicenseData, updateLicense with events)");
        console.log("3. Monitor events: LicenseStatusChanged, LicenseURIUpdated, CoordinatorStatusChanged");
    }
}
