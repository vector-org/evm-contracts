// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LicenseFactory} from "../src/LicenseFactory.sol";
import {LicenseInput} from "../src/types/Types.sol";

contract MintGames is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address admin = vm.addr(deployerPrivateKey);

        // Use the deployed LicenseFactory proxy address
        address factoryProxyAddress = 0xb6133cA36D8324027566CA8Da79AdD2D5893EF83;
        address primaryMarketplaceAddress = 0xf222B95Cf875BBD7B2F4Bc6BBD79260a3BDeDf63;
        address secondaryMarketplaceAddress = 0xb4FF531457636B27912607aa04DAF0E4a523Defa;

        LicenseFactory factory = LicenseFactory(factoryProxyAddress);

        // Convert 19 ETH to wei
        uint256 devFee = 19 ether;

        // Create LicenseInput for Lyra
        LicenseInput memory lyraInput = LicenseInput({
            name: "Lyra",
            symbol: "LYRA",
            uri: "https://lyra.game/metadata",
            isActive: true,
            developerFee: devFee,
            platformFee: 0, // Set to 0 for now
            publisherFee: 0, // Set to 0 for now
            developer: admin,
            publisher: admin,
            platform: admin,
            primaryMarketplace: primaryMarketplaceAddress,
            secondaryMarketplace: secondaryMarketplaceAddress
        });

        // Create LicenseInput for Doom
        LicenseInput memory doomInput = LicenseInput({
            name: "Doom",
            symbol: "DOOM",
            uri: "https://doom.game/metadata",
            isActive: true,
            developerFee: devFee,
            platformFee: 0,
            publisherFee: 0,
            developer: admin,
            publisher: admin,
            platform: admin,
            primaryMarketplace: primaryMarketplaceAddress,
            secondaryMarketplace: secondaryMarketplaceAddress
        });

        // Create LicenseInput for Pixel Dungeons
        LicenseInput memory pixelDungeonsInput = LicenseInput({
            name: "Pixel Dungeons",
            symbol: "PXDNG",
            uri: "https://pixeldungeons.game/metadata",
            isActive: true,
            developerFee: devFee,
            platformFee: 0,
            publisherFee: 0,
            developer: admin,
            publisher: admin,
            platform: admin,
            primaryMarketplace: primaryMarketplaceAddress,
            secondaryMarketplace: secondaryMarketplaceAddress
        });

        // Create the licenses
        address lyraContract = factory.createLicense(lyraInput);
        address doomContract = factory.createLicense(doomInput);
        address pixelDungeonsContract = factory.createLicense(
            pixelDungeonsInput
        );

        console.log("=== Game Licenses Created ===");
        console.log("Lyra License Contract:", lyraContract);
        console.log("Doom License Contract:", doomContract);
        console.log("Pixel Dungeons License Contract:", pixelDungeonsContract);
        console.log("");
        console.log("All games created with 19 ETH developer fee");

        vm.stopBroadcast();
    }
}
