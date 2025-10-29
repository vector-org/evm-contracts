// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "forge-std/Script.sol";
import {BaseScript} from "../helpers/BaseScript.s.sol";
import {SecondaryMarketPlace} from "../../src/SecondaryMarketPlace.sol";

contract CreateSecondaryOffer is BaseScript {
    event OfferCreated(uint256 tokenId, address license, uint256 priceWei);

    function run(uint256 tokenId, address license, uint256 priceWei) public {
        BaseScript.CoreConfig memory cfg = loadCore();

        beginBroadcast(cfg.deployerKey);
        SecondaryMarketPlace(cfg.secondaryProxy).createOffer(tokenId, license, priceWei);
        endBroadcast();

        emit OfferCreated(tokenId, license, priceWei);
        console.log("Created secondary offer:");
        console.log("  tokenId:", tokenId);
        console.log("  license:", license);
        console.log("  price (wei):", priceWei);
        console.log("  marketplace:", cfg.secondaryProxy);
    }
}
