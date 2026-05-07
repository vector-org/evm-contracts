// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LicenseFactory} from "src/LicenseFactory.sol";
import {LicenseInput} from "src/types/Types.sol";

/**
 * @title MigrateLicenses
 * @notice Recreate licenses 0-4 with new ERC-5192 soulbound bytecode as licenses 5-9
 * 
 * @dev This script migrates old licenses to new ones with ERC-5192 support.
 * Old licenses were deployed with bytecode that doesn't have safeMintLocked().
 * New licenses will be deployed with the updated LicenseContract bytecode.
 * 
 * Usage:
 *   export PRIVATE_KEY=<your-deployer-private-key>
 *   
 *   # Dry run
 *   forge script script/MigrateLicenses.s.sol:MigrateLicenses --rpc-url https://sepolia.base.org -vvvv
 *   
 *   # Production
 *   forge script script/MigrateLicenses.s.sol:MigrateLicenses --rpc-url https://sepolia.base.org --broadcast -vvvv
 */
contract MigrateLicenses is Script {
    // Base Sepolia addresses
    address constant FACTORY = 0xA21DA419c44767ADae4407C7A1fCAd05f9337026;
    address constant PRIMARY_MARKETPLACE = 0x49A5FD51FF4Cb5Fd648B5485e349D2fac03BEABd;
    address constant SECONDARY_MARKETPLACE = 0x7C2fFdF9b2A5431D9a77F39C5E5Be2FCdCdD245f;
    address constant OWNER = 0x1337d6F6f3C2FD271a24C330Af80cCce46c1BF07;
    address constant PLATFORM = 0x75045c6B3DfE667E4451146fFA238d6C97066565;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        
        console.log("============================================================");
        console.log("LICENSE MIGRATION: Old (0-4) -> New (5-9) with ERC-5192");
        console.log("============================================================");
        console.log("Network: Base Sepolia");
        console.log("Factory:", FACTORY);
        console.log("");

        vm.startBroadcast(deployerKey);

        LicenseFactory factory = LicenseFactory(FACTORY);

        // ============================================================
        // License 5 (was 0): Lyra On Vector
        // Old Contract: 0xB038af467bB2BBc55c8703BA089742Ae622eadC4
        // ============================================================
        console.log("Creating License 5: Lyra On Vector");
        address addr5 = factory.createLicense(LicenseInput({
            name: "Lyra On Vector",
            symbol: "LOV",
            uri: "https://lyra.game/metadata",
            isActive: true,
            totalFee: 19990000, // developerFee: 18990500 + platformFee: 999500
            developer: OWNER,
            platform: PLATFORM,
            primaryMarketplace: PRIMARY_MARKETPLACE,
            secondaryMarketplace: SECONDARY_MARKETPLACE
        }));
        console.log("  New License ID: 5");
        console.log("  New Contract:", addr5);

        // ============================================================
        // License 6 (was 1): Doom
        // Old Contract: 0x061e650fe1bE0319CB830B7073d3Cd2CaF6C5367
        // ============================================================
        console.log("Creating License 6: Doom");
        address addr6 = factory.createLicense(LicenseInput({
            name: "Doom",
            symbol: "DOOM",
            uri: "https://doom.game/metadata",
            isActive: true,
            totalFee: 9990000, // developerFee: 9490500 + platformFee: 499500
            developer: OWNER,
            platform: PLATFORM,
            primaryMarketplace: PRIMARY_MARKETPLACE,
            secondaryMarketplace: SECONDARY_MARKETPLACE
        }));
        console.log("  New License ID: 6");
        console.log("  New Contract:", addr6);

        // ============================================================
        // License 7 (was 2): Shattered Pixel Dungeon
        // Old Contract: 0x1D4B567DC909b22BFADd219923Ee1b09ee73ba45
        // ============================================================
        console.log("Creating License 7: Shattered Pixel Dungeon");
        address addr7 = factory.createLicense(LicenseInput({
            name: "Shattered Pixel Dungeon",
            symbol: "SPD",
            uri: "https://pixeldungeon.game/metadata",
            isActive: true,
            totalFee: 4990000, // developerFee: 4740500 + platformFee: 249500
            developer: OWNER,
            platform: PLATFORM,
            primaryMarketplace: PRIMARY_MARKETPLACE,
            secondaryMarketplace: SECONDARY_MARKETPLACE
        }));
        console.log("  New License ID: 7");
        console.log("  New Contract:", addr7);

        // ============================================================
        // License 8 (was 3): Last Drop
        // Old Contract: 0x08C79063B15dEE45864C059aDf4C6A3D5c435b2D
        // ============================================================
        console.log("Creating License 8: Last Drop");
        address addr8 = factory.createLicense(LicenseInput({
            name: "Last Drop",
            symbol: "LD",
            uri: "https://lastdrop.game/metadata",
            isActive: true,
            totalFee: 0, // Free game
            developer: OWNER,
            platform: PLATFORM,
            primaryMarketplace: PRIMARY_MARKETPLACE,
            secondaryMarketplace: SECONDARY_MARKETPLACE
        }));
        console.log("  New License ID: 8");
        console.log("  New Contract:", addr8);

        // ============================================================
        // License 9 (was 4): GASShooter
        // Old Contract: 0xBaC89E37EE938B9fD1769AE7bf834B9FA91A1Fb1
        // ============================================================
        console.log("Creating License 9: GASShooter");
        address addr9 = factory.createLicense(LicenseInput({
            name: "GASShooter",
            symbol: "GASSHTR",
            uri: "https://gasshooter.game/metadata",
            isActive: true,
            totalFee: 1990000, // developerFee: 1890500 + platformFee: 99500
            developer: OWNER,
            platform: PLATFORM,
            primaryMarketplace: PRIMARY_MARKETPLACE,
            secondaryMarketplace: SECONDARY_MARKETPLACE
        }));
        console.log("  New License ID: 9");
        console.log("  New Contract:", addr9);

        vm.stopBroadcast();

        // ============================================================
        // SUMMARY
        // ============================================================
        console.log("");
        console.log("============================================================");
        console.log("MIGRATION COMPLETE!");
        console.log("============================================================");
        console.log("");
        console.log("New License Mapping (for database update):");
        console.log("------------------------------------------------------------");
        console.log("| Old ID | New ID | Name                    | New Contract");
        console.log("------------------------------------------------------------");
        console.log("| 0      | 5      | Lyra On Vector          |", addr5);
        console.log("| 1      | 6      | Doom                    |", addr6);
        console.log("| 2      | 7      | Shattered Pixel Dungeon |", addr7);
        console.log("| 3      | 8      | Last Drop               |", addr8);
        console.log("| 4      | 9      | GASShooter              |", addr9);
        console.log("------------------------------------------------------------");
        console.log("");
        console.log("IMPORTANT: Update Supabase database with new license IDs and contract addresses!");
    }
}
