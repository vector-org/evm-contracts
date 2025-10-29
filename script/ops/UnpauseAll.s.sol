// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "forge-std/Script.sol";
import {BaseScript} from "../helpers/BaseScript.s.sol";

interface IUnpausable {
    function unpause() external;
}

contract UnpauseAll is BaseScript {
    function run() external {
        BaseScript.CoreConfig memory cfg = loadCore();
        beginBroadcast(cfg.deployerKey);
        IUnpausable(cfg.factoryProxy).unpause();
        IUnpausable(cfg.primaryProxy).unpause();
        IUnpausable(cfg.secondaryProxy).unpause();
        endBroadcast();
        console.log("Unpaused factory, primary, secondary proxies");
    }
}
