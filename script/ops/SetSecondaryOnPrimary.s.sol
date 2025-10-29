// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "forge-std/Script.sol";
import {PrimaryMarketPlace} from "../../src/PrimaryMarketPlace.sol";
import {BaseScript} from "../helpers/BaseScript.s.sol";

contract SetSecondaryOnPrimary is BaseScript {
    event SecondaryMarketplaceLinked(address secondary);

    function run(address secondary) public {
        BaseScript.CoreConfig memory cfg = loadCore();

        beginBroadcast(cfg.deployerKey);
        PrimaryMarketPlace(cfg.primaryProxy).setSecondaryMarketPlace(secondary);
        endBroadcast();

        emit SecondaryMarketplaceLinked(secondary);
        console.log("Linked primary marketplace to secondary:");
        console.log("  primary marketplace:", cfg.primaryProxy);
        console.log("  secondary marketplace:", secondary);
    }
}
