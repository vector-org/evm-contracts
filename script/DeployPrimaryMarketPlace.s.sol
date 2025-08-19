// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LicenseFactory} from "../src/LicenseFactory.sol";
import {PrimaryMarketPlace} from "../src/PrimaryMarketPlace.sol";

contract DeployPrimaryMarketPlace is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        LicenseFactory licenseFactory = new LicenseFactory();
        console.log("LicenseFactory deployed to:", address(licenseFactory));

        PrimaryMarketPlace primaryMarketPlace = new PrimaryMarketPlace(
            0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2,
            0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2,
            address(licenseFactory)
        );

        console.log(
            "PrimaryMarketPlace deployed to:",
            address(primaryMarketPlace)
        );

        vm.stopBroadcast();
    }
}
