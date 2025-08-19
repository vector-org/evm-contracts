// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LicenseContract} from "../src/LicenseContract.sol";

contract DeployLicenseContract is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log(
            "LicenseContract deployment requires specific constructor parameters."
        );
        console.log(
            "This contract is typically deployed through the LicenseFactory."
        );

        vm.stopBroadcast();
    }
}
