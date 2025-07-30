// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LicenseFactory} from "../src/LicenseFactory.sol";
import {PrimaryMarketPlace} from "../src/PrimaryMarketPlace.sol";
import {SecondaryMarketPlace} from "../src/SecondaryMarketPlace.sol";

contract MasterDeployment is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy LicenseFactory first
        LicenseFactory licenseFactory = new LicenseFactory();
        console.log("LicenseFactory deployed to:", address(licenseFactory));

        // Deploy PrimaryMarketPlace
        PrimaryMarketPlace primaryMarketPlace = new PrimaryMarketPlace(
            0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2, // fee wallet
            0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2, // royalty wallet
            address(licenseFactory)
        );
        console.log("PrimaryMarketPlace deployed to:", address(primaryMarketPlace));

        // Deploy SecondaryMarketPlace
        SecondaryMarketPlace secondaryMarketPlace = new SecondaryMarketPlace(
            0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2, // fee wallet
            0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2, // royalty wallet
            address(licenseFactory),
            address(primaryMarketPlace)
        );
        console.log("SecondaryMarketPlace deployed to:", address(secondaryMarketPlace));

        console.log("=== Master Deployment Complete ===");
        console.log("LicenseFactory:", address(licenseFactory));
        console.log("PrimaryMarketPlace:", address(primaryMarketPlace));
        console.log("SecondaryMarketPlace:", address(secondaryMarketPlace));

        vm.stopBroadcast();
    }
}