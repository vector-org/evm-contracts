// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LicenseFactory} from "../src/LicenseFactory.sol";
import {PrimaryMarketPlace} from "../src/PrimaryMarketPlace.sol";
import {SecondaryMarketPlace} from "../src/SecondaryMarketPlace.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MasterProxyDeployment is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        address admin = vm.addr(deployerPrivateKey);

        LicenseFactory factoryImpl = new LicenseFactory();
        PrimaryMarketPlace primaryImpl = new PrimaryMarketPlace();
        SecondaryMarketPlace secondaryImpl = new SecondaryMarketPlace();

        ERC1967Proxy factoryProxy = new ERC1967Proxy(
            address(factoryImpl),
            abi.encodeWithSelector(
                LicenseFactory.initialize.selector,
                admin
            )
        );

        ERC1967Proxy primaryProxy = new ERC1967Proxy(
            address(primaryImpl),
            abi.encodeWithSelector(
                PrimaryMarketPlace.initialize.selector,
                admin,
                admin,
                address(factoryProxy)
            )
        );

        ERC1967Proxy secondaryProxy = new ERC1967Proxy(
            address(secondaryImpl),
            abi.encodeWithSelector(
                SecondaryMarketPlace.initialize.selector,
                admin,
                admin,
                address(factoryProxy),
                address(primaryProxy)
            )
        );

        console.log("=== Master Proxy Deployment Complete ===");
        console.log("LicenseFactory Implementation:", address(factoryImpl));
        console.log("LicenseFactory Proxy:", address(factoryProxy));
        console.log("PrimaryMarketPlace Implementation:", address(primaryImpl));
        console.log("PrimaryMarketPlace Proxy:", address(primaryProxy));
        console.log("SecondaryMarketPlace Implementation:", address(secondaryImpl));
        console.log("SecondaryMarketPlace Proxy:", address(secondaryProxy));

        vm.stopBroadcast();
    }
}

contract MasterUpgrade is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address factoryProxy = vm.envAddress("FACTORY_PROXY_ADDRESS");
        address primaryProxy = vm.envAddress("PRIMARY_PROXY_ADDRESS");
        address secondaryProxy = vm.envAddress("SECONDARY_PROXY_ADDRESS");

        LicenseFactory newFactoryImpl = new LicenseFactory();
        PrimaryMarketPlace newPrimaryImpl = new PrimaryMarketPlace();
        SecondaryMarketPlace newSecondaryImpl = new SecondaryMarketPlace();

        LicenseFactory(factoryProxy).upgradeToAndCall(
            address(newFactoryImpl),
            ""
        );

        PrimaryMarketPlace(primaryProxy).upgradeToAndCall(
            address(newPrimaryImpl),
            ""
        );

        SecondaryMarketPlace(secondaryProxy).upgradeToAndCall(
            address(newSecondaryImpl),
            ""
        );

        console.log("=== Master Upgrade Complete ===");
        console.log("LicenseFactory upgraded to:", address(newFactoryImpl));
        console.log("PrimaryMarketPlace upgraded to:", address(newPrimaryImpl));
        console.log("SecondaryMarketPlace upgraded to:", address(newSecondaryImpl));

        vm.stopBroadcast();
    }
}