// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LicenseFactory} from "../src/LicenseFactory.sol";

contract DeployLicenseFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        LicenseFactory licenseFactory = new LicenseFactory();

        console.log("LicenseFactory deployed to:", address(licenseFactory));

        vm.stopBroadcast();
    }
}
