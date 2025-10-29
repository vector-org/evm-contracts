// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "forge-std/Script.sol";
import {BaseScript} from "../helpers/BaseScript.s.sol";
import {SecondaryMarketPlace} from "../../src/SecondaryMarketPlace.sol";
import {Offer} from "../../src/types/Types.sol";

contract AcceptSecondaryOffer is BaseScript {
    event OfferAccepted(uint256 tokenId, uint256 priceWei);

    function run(uint256 tokenId, uint256 priceWei) public {
        BaseScript.CoreConfig memory cfg = loadCore();

        SecondaryMarketPlace secondary = SecondaryMarketPlace(cfg.secondaryProxy);

        beginBroadcast(cfg.deployerKey);
        secondary.acceptOffer{value: priceWei}(tokenId);
        endBroadcast();

        emit OfferAccepted(tokenId, priceWei);
        Offer memory offer = secondary.getOffer(tokenId);

        console.log("Accepted secondary offer:");
        console.log("  buyer:", cfg.admin);
        console.log("  tokenId:", tokenId);
        console.log("  price paid (wei):", priceWei);
        console.log("  seller:", offer.seller);
        console.log("  license:", offer.licenseAddress);
        console.log("  marketplace:", cfg.secondaryProxy);
    }
}
