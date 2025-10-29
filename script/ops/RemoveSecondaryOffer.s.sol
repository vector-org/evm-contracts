// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "forge-std/Script.sol";
import {BaseScript} from "../helpers/BaseScript.s.sol";
import {SecondaryMarketPlace} from "../../src/SecondaryMarketPlace.sol";

contract RemoveSecondaryOffer is BaseScript {
    event OfferRemoved(uint256 tokenId);

    function run(uint256 tokenId) public {
        BaseScript.CoreConfig memory cfg = loadCore();

        beginBroadcast(cfg.deployerKey);
        SecondaryMarketPlace(cfg.secondaryProxy).removeOffer(tokenId);
        endBroadcast();

        emit OfferRemoved(tokenId);
        console.log("Removed secondary offer:");
        console.log("  tokenId:", tokenId);
        console.log("  marketplace:", cfg.secondaryProxy);
    }
}
