// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "forge-std/Script.sol";
import {LicenseFactory} from "../../src/LicenseFactory.sol";
import {BaseScript} from "../helpers/BaseScript.s.sol";

contract CoordinatorManager is BaseScript {
    event CoordinatorStatusUpdated(address coordinator, bool enabled);

    function run(address coordinator, bool enable) public {
        BaseScript.CoreConfig memory cfg = loadCore();

        beginBroadcast(cfg.deployerKey);
        LicenseFactory(cfg.factoryProxy).setCoordinator(coordinator, enable);
        endBroadcast();

        emit CoordinatorStatusUpdated(coordinator, enable);
        console.log("Updated coordinator status:");
        console.log("  coordinator:", coordinator);
        console.log("  enabled:", enable);
        console.log("  factory:", cfg.factoryProxy);
    }
}
