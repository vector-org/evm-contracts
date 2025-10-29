// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "forge-std/Script.sol";
import {BaseScript} from "../helpers/BaseScript.s.sol";
import {LicenseFactory} from "../../src/LicenseFactory.sol";
import {PrimaryMarketPlace} from "../../src/PrimaryMarketPlace.sol";
import {SecondaryMarketPlace} from "../../src/SecondaryMarketPlace.sol";
import {IPrimaryMarketPlace} from "../../src/interfaces/IPrimaryMarketPlace.sol";
import {License, Offer} from "../../src/types/Types.sol";

contract DumpState is BaseScript {
    function run() external {
        BaseScript.CoreConfig memory cfg = loadCore();
        LicenseFactory factory = LicenseFactory(cfg.factoryProxy);
        SecondaryMarketPlace secondary = SecondaryMarketPlace(cfg.secondaryProxy);
        PrimaryMarketPlace primaryProxy = PrimaryMarketPlace(cfg.primaryProxy);
        IPrimaryMarketPlace primary = IPrimaryMarketPlace(cfg.primaryProxy);

        console.log("Config snapshot:");
        console.log("  broadcaster:", cfg.admin);
        console.log("  factory proxy:", cfg.factoryProxy);
        console.log("  primary proxy:", cfg.primaryProxy);
        console.log("  secondary proxy:", cfg.secondaryProxy);

        console.log("Proxy owners:");
        console.log("  factory owner:", factory.owner());
        console.log("  primary owner:", primaryProxy.owner());
        console.log("  secondary owner:", secondary.owner());

        uint256[] memory ids = factory.getAllLicenseIds();
        console.log("Licenses: %s", ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            License memory lic = factory.getLicenseFromId(ids[i]);
            console.log("#%s", ids[i]);
            console.log("  name: %s", lic.name);
            console.log("  symbol: %s", lic.symbol);
            console.log("  addr: %s", lic.contractAddress);
            console.log("  owner:", lic.owner);
            console.log("  coordinator:", lic.coordinator);
            string memory activeStr = lic.isActive ? "true" : "false";
            console.log("  active: %s", activeStr);
            console.log("  uri: %s", lic.uri);
            console.log(
                "  fees (dev/publisher/platform): %s/%s/%s",
                lic.developerFee,
                lic.publisherFee,
                lic.platformFee
            );
            console.log("  recipients:");
            console.log("    developer:", lic.developer);
            console.log("    publisher:", lic.publisher);
            console.log("    platform:", lic.platform);
        }

        uint256[] memory allNftIds = primary.getAllNftIds();
        console.log("Primary NFTs: %s", allNftIds.length);

        Offer[] memory offers = secondary.getOpenOffers();
        console.log("Open offers: %s", offers.length);
        for (uint256 j = 0; j < offers.length; j++) {
            console.log("  token: %s", offers[j].tokenId);
            console.log("    price: %s", offers[j].price);
            console.log("    seller: %s", offers[j].seller);
            console.log("    buyer: %s", offers[j].buyer);
            console.log("    license: %s", offers[j].licenseAddress);
        }
    }
}
