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

        address factoryProxyAddress = 0xb6133cA36D8324027566CA8Da79AdD2D5893EF83;
        address primaryMarketplaceAddress = 0xf222B95Cf875BBD7B2F4Bc6BBD79260a3BDeDf63;
        address secondaryMarketplaceAddress = 0xb4FF531457636B27912607aa04DAF0E4a523Defa;

        LicenseFactory factory = LicenseFactory(factoryProxyAddress);

        uint256 devFee = 0.1 ether;

        LicenseInput memory lyraInput = LicenseInput({
            name: "Lyra",
            symbol: "LYRA",
            uri: "https://lyra.game/metadata",
            isActive: true,
            totalFee: devFee,
            developer: admin,
            platform: admin,
            primaryMarketplace: primaryMarketplaceAddress,
            secondaryMarketplace: secondaryMarketplaceAddress
        });

        LicenseInput memory doomInput = LicenseInput({
            name: "Doom",
            symbol: "DOOM",
            uri: "https://doom.game/metadata",
            isActive: true,
            totalFee: devFee,
            developer: admin,
            platform: admin,
            primaryMarketplace: primaryMarketplaceAddress,
            secondaryMarketplace: secondaryMarketplaceAddress
        });

        LicenseInput memory pixelDungeonsInput = LicenseInput({
            name: "Pixel Dungeons",
            symbol: "PXDNG",
            uri: "https://pixeldungeons.game/metadata",
            isActive: true,
            totalFee: devFee,
            developer: admin,
            platform: admin,
            primaryMarketplace: primaryMarketplaceAddress,
            secondaryMarketplace: secondaryMarketplaceAddress
        });

        address lyraContract = factory.createLicense(lyraInput);
        address doomContract = factory.createLicense(doomInput);
        address pixelDungeonsContract = factory.createLicense(pixelDungeonsInput);

        console.log("Lyra License Contract:", lyraContract);
        console.log("Doom License Contract:", doomContract);
        console.log("Pixel Dungeons License Contract:", pixelDungeonsContract);

        vm.stopBroadcast();
    }
}
