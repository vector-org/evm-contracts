// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LicenseFactory} from "src/LicenseFactory.sol";
import {License, LicenseInput} from "src/types/Types.sol";

/**
 * @title AdjustLicensePrices
 * @notice Foundry script to batch update license (game) prices via LicenseFactory.changeLicenseData.
 * @dev Matches licenses by (case-insensitive) name and updates only the totalFee (price) while preserving
 *      other mutable metadata (name, symbol, uri, isActive, parties, marketplaces).
 *
 * Usage (example):
 *  export PRIVATE_KEY=0x...   # key of an admin or coordinator authorized to call changeLicenseData
 *  forge script script/AdjustLicensePrices.s.sol:AdjustLicensePrices \
 *      --rpc-url $RPC_URL --broadcast -vvvv
 */
contract AdjustLicensePrices is Script {
    // USDC prices (6 decimals) - Updated for USDC integration
    uint256 constant PRICE_LYRA_ON_VECTOR = 19.99e6;      // 19990000 (6 decimals)
    uint256 constant PRICE_DOOM = 9.99e6;                  // 9990000 (6 decimals)
    uint256 constant PRICE_SHATTERED_PIXEL_DUNGEON = 4.99e6; // 4990000 (6 decimals)
    uint256 constant PRICE_LAST_DROP = 0;                  // 0 (free)
    uint256 constant PRICE_GASSHOOTER = 1.99e6;           // 1990000 (6 decimals)

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address sender = vm.addr(pk);
        console.log("AdjustLicensePrices executing from");
        console.log(sender);

        address factoryAddr = vm.envAddress("FACTORY_PROXY_ADDRESS");
        address primaryAddr = vm.envAddress("PRIMARY_PROXY_ADDRESS");
        address secondaryAddr = vm.envAddress("SECONDARY_PROXY_ADDRESS");

        vm.startBroadcast(pk);
        LicenseFactory factory = LicenseFactory(factoryAddr);

        uint256[] memory ids = factory.getAllLicenseIds();
        console.log("Found license IDs count:");
        console.log(ids.length);

        uint256 updates;

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            License memory L = factory.getLicenseFromId(id);

            (bool shouldUpdate, uint256 newPrice) = _lookupTargetPrice(L.name);
            if (!shouldUpdate) continue;

            uint256 currentTotal = L.developerFee +
                L.platformFee;
            if (currentTotal == newPrice) {
                console.log("Skipping id (already at target price)");
                console.log(id);
                continue;
            }

            LicenseInput memory input = LicenseInput({
                name: L.name,
                symbol: L.symbol,
                uri: L.uri,
                isActive: L.isActive,
                totalFee: newPrice,
                developer: L.developer,
                platform: L.platform,
                primaryMarketplace: primaryAddr,
                secondaryMarketplace: secondaryAddr
            });

            factory.changeLicenseData(id, input);
            ++updates;
            console.log("Updated id");
            console.log(id);
            console.log("Name:");
            console.log(
                bytes(L.name).length > 0 ? L.name : string(abi.encodePacked(""))
            );
            console.log("New totalFee (wei):");
            console.log(newPrice);
        }

        vm.stopBroadcast();
        console.log("Price adjustment complete. Total updates:");
        console.log(updates);
    }

    function _lookupTargetPrice(
        string memory name
    ) internal pure returns (bool, uint256) {
        bytes32 h = keccak256(bytes(name));
        if (h == keccak256(bytes("Lyra On Vector")))
            return (true, PRICE_LYRA_ON_VECTOR);
        if (h == keccak256(bytes("Doom"))) return (true, PRICE_DOOM);
        if (h == keccak256(bytes("Shattered Pixel Dungeon")))
            return (true, PRICE_SHATTERED_PIXEL_DUNGEON);
        if (h == keccak256(bytes("Last Drop"))) return (true, PRICE_LAST_DROP);
        if (h == keccak256(bytes("GASShooter")))
            return (true, PRICE_GASSHOOTER);
        return (false, 0);
    }
}
