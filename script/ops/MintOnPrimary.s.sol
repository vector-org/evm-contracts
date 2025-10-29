// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "forge-std/Script.sol";
import {BaseScript} from "../helpers/BaseScript.s.sol";
import {LicenseFactory} from "../../src/LicenseFactory.sol";
import {PrimaryMarketPlace} from "../../src/PrimaryMarketPlace.sol";
import {License} from "../../src/types/Types.sol";

contract MintOnPrimary is BaseScript {
    event PrimaryMint(uint256 licenseId, address receiver, uint256 totalFeeWei);

    // Overload: default empty URI
    function run(uint256 licenseId, address receiver) public {
        run(licenseId, receiver, "");
    }

    function run(uint256 licenseId, address receiver, string memory uri) public {
        BaseScript.CoreConfig memory cfg = loadCore();

        LicenseFactory factory = LicenseFactory(cfg.factoryProxy);
        PrimaryMarketPlace primary = PrimaryMarketPlace(cfg.primaryProxy);
        License memory lic = factory.getLicenseFromId(licenseId);
        uint256 totalFee = lic.developerFee + lic.publisherFee + lic.platformFee;

        beginBroadcast(cfg.deployerKey);
        primary.mintLicense{value: totalFee}(
            licenseId,
            receiver,
            uri
        );
        endBroadcast();

        emit PrimaryMint(licenseId, receiver, totalFee);
        uint256[] memory nftIds = primary.getAllNftIds();
        uint256 mintedTokenId = nftIds.length > 0 ? nftIds[nftIds.length - 1] : 0;

        console.log("Minted primary license token:");
        console.log("  licenseId:", licenseId);
        console.log("  minted tokenId:", mintedTokenId);
        console.log("  receiver:", receiver);
        console.log("  uri: %s", uri);
        console.log("  total fee (wei):", totalFee);
        console.log("    developer fee:", lic.developerFee);
        console.log("    publisher fee:", lic.publisherFee);
        console.log("    platform fee:", lic.platformFee);
        console.log("  primary marketplace:", cfg.primaryProxy);
    }
}
