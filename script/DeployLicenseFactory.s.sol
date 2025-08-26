// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LicenseFactory} from "../src/LicenseFactory.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployLicenseFactoryProxy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        address admin = vm.addr(deployerPrivateKey);

        LicenseFactory factoryImpl = new LicenseFactory();

        ERC1967Proxy factoryProxy = new ERC1967Proxy(
            address(factoryImpl),
            abi.encodeWithSelector(
                LicenseFactory.initialize.selector,
                admin
            )
        );

        console.log("LicenseFactory Implementation:", address(factoryImpl));
        console.log("LicenseFactory Proxy:", address(factoryProxy));

        vm.stopBroadcast();
    }
}

contract DeployLicenseFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address factoryProxy = vm.envAddress("FACTORY_PROXY_ADDRESS");
        LicenseFactory licenseFactoryImpl = new LicenseFactory();

        LicenseFactory(factoryProxy).upgradeToAndCall(
            address(licenseFactoryImpl),
            ""
        );

        console.log("LicenseFactory upgraded to:", address(licenseFactoryImpl));

        vm.stopBroadcast();
    }
}
