// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "forge-std/Script.sol";
import {BaseScript} from "../helpers/BaseScript.s.sol";

interface IPausable {
    function pause() external;
}

contract PauseAll is BaseScript {
    function run() external {
        BaseScript.CoreConfig memory cfg = loadCore();
        beginBroadcast(cfg.deployerKey);
        IPausable(cfg.factoryProxy).pause();
        IPausable(cfg.primaryProxy).pause();
        IPausable(cfg.secondaryProxy).pause();
        endBroadcast();
        console.log("Paused factory, primary, secondary proxies");
    }
}
