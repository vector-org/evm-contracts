// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";

abstract contract BaseScript is Script {
    struct CoreConfig {
        address admin;
        address factoryProxy;
        address primaryProxy;
        address secondaryProxy;
        uint256 deployerKey;
    }

    function loadCore() internal returns (CoreConfig memory cfg) {
        cfg.deployerKey = vm.envUint("PRIVATE_KEY");
        cfg.admin = vm.addr(cfg.deployerKey);
        cfg.factoryProxy = vm.envAddress("FACTORY_PROXY_ADDRESS");
        cfg.primaryProxy = vm.envAddress("PRIMARY_PROXY_ADDRESS");
        cfg.secondaryProxy = vm.envAddress("SECONDARY_PROXY_ADDRESS");
        return cfg;
    }

    function beginBroadcast(uint256 key) internal {
        vm.startBroadcast(key);
    }

    function endBroadcast() internal {
        vm.stopBroadcast();
    }
}
