// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LicenseFactory} from "../src/LicenseFactory.sol";
import {LicenseInput} from "../src/types/Types.sol";

/**
 * @title MintGamesV2
 * @notice Recreates the 5 games from the old deployment using exported migration data
 * @dev Run with: forge script script/MintGamesV2.s.sol:MintGamesV2 --rpc-url $RPC_URL --broadcast --slow -vv
 */
contract MintGamesV2 is Script {
    // Base Sepolia deployment addresses (deployed 2025-11-17)
    address constant FACTORY_PROXY = 0xA21DA419c44767ADae4407C7A1fCAd05f9337026;
    address constant PRIMARY_PROXY = 0x49A5FD51FF4Cb5Fd648B5485e349D2fac03BEABd;
    address constant SECONDARY_PROXY = 0x7C2fFdF9b2A5431D9a77F39C5E5Be2FCdCdD245f;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerPrivateKey);
        address platform = vm.envAddress("PLATFORM_ADDRESS");
        
        console.log("=== Minting Games from Migration Data ===");
        console.log("Admin/Owner:", admin);
        console.log("Platform (receives 5% fees):", platform);
        console.log("Factory:", FACTORY_PROXY);
        console.log("Primary Marketplace:", PRIMARY_PROXY);
        console.log("Secondary Marketplace:", SECONDARY_PROXY);
        console.log("");

        LicenseFactory factory = LicenseFactory(FACTORY_PROXY);

        // USDC prices (6 decimals) - matching AdjustLicensePrices.s.sol
        uint256 PRICE_LYRA_ON_VECTOR = 19.99e6;           // 19.99 USDC
        uint256 PRICE_DOOM = 9.99e6;                      // 9.99 USDC
        uint256 PRICE_SHATTERED_PIXEL_DUNGEON = 4.99e6;  // 4.99 USDC
        uint256 PRICE_LAST_DROP = 0;                      // FREE
        uint256 PRICE_GASSHOOTER = 1.99e6;               // 1.99 USDC

        vm.startBroadcast(deployerPrivateKey);

        // Game 0: Lyra On Vector
        createGame(
            factory,
            admin,
            platform,
            "Lyra On Vector",
            "LOV",
            "https://lyra.game/metadata",
            PRICE_LYRA_ON_VECTOR
        );

        // Game 1: Doom
        createGame(
            factory,
            admin,
            platform,
            "Doom",
            "DOOM",
            "https://doom.game/metadata",
            PRICE_DOOM
        );

        // Game 2: Shattered Pixel Dungeon
        createGame(
            factory,
            admin,
            platform,
            "Shattered Pixel Dungeon",
            "SPD",
            "https://pixeldungeon.game/metadata",
            PRICE_SHATTERED_PIXEL_DUNGEON
        );

        // Game 3: Last Drop (FREE)
        createGame(
            factory,
            admin,
            platform,
            "Last Drop",
            "LD",
            "https://lastdrop.game/metadata",
            PRICE_LAST_DROP
        );

        // Game 4: GASShooter
        createGame(
            factory,
            admin,
            platform,
            "GASShooter",
            "GASSHTR",
            "https://gasshooter.game/metadata",
            PRICE_GASSHOOTER
        );

        vm.stopBroadcast();

        console.log("");
        console.log("=== Minting Complete ===");
        console.log("Total games created: 5");
        console.log("Owner: Deployer (admin)");
    }

    function createGame(
        LicenseFactory factory,
        address developer,
        address platform,
        string memory name,
        string memory symbol,
        string memory uri,
        uint256 totalFee
    ) internal {
        LicenseInput memory input = LicenseInput({
            name: name,
            symbol: symbol,
            uri: uri,
            isActive: true,
            totalFee: totalFee,
            developer: developer,
            platform: platform,
            primaryMarketplace: PRIMARY_PROXY,
            secondaryMarketplace: SECONDARY_PROXY
        });

        address licenseContract = factory.createLicense(input);
        
        console.log("Created:", name);
        console.log("  Symbol:", symbol);
        console.log("  Contract:", licenseContract);
        console.log("  Total Fee:", totalFee);
        console.log("");
    }
}
