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
    // Proxy addresses (given in user request)
    address constant FACTORY_PROXY_ADDRESS =
        0x2C7548B2BBecF649976D4eEe6c0Ff586fab444b7;
    address constant PRIMARY_PROXY_ADDRESS =
        0x8bFef9D303DB1EcE5Ed9B5Bdb39521f608fcf182;
    address constant SECONDARY_PROXY_ADDRESS =
        0x5AeBe1d988e556eEc0D74E009E9831CEE70B988F;

    uint256 constant PRICE_DOOM = 999 * 1e16; // doom
    uint256 constant PRICE_GASSHOOTER = 199 * 1e16; // GASShooter
    uint256 constant PRICE_LYRA_ON_VECTOR = 1999 * 1e16; // Lyra On Vector
    uint256 constant PRICE_SHATTERED_PIXEL_DUNGEON = 499 * 1e16; // Shattered Pixel Dungeon
    uint256 constant PRICE_LAST_DROP = 0; // Last Drop

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address sender = vm.addr(pk);
        console.log("AdjustLicensePrices executing from");
        console.log(sender);

        vm.startBroadcast(pk);
        LicenseFactory factory = LicenseFactory(FACTORY_PROXY_ADDRESS);

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
                L.platformFee +
                L.publisherFee;
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
                publisher: L.publisher,
                platform: L.platform,
                primaryMarketplace: PRIMARY_PROXY_ADDRESS,
                secondaryMarketplace: SECONDARY_PROXY_ADDRESS
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
        if (h == keccak256(bytes("doom"))) return (true, PRICE_DOOM);
        if (h == keccak256(bytes("GASShooter")))
            return (true, PRICE_GASSHOOTER);
        if (h == keccak256(bytes("Lyra On Vector")))
            return (true, PRICE_LYRA_ON_VECTOR);
        if (h == keccak256(bytes("Shattered Pixel Dungeon")))
            return (true, PRICE_SHATTERED_PIXEL_DUNGEON);
        if (h == keccak256(bytes("Last Drop"))) return (true, PRICE_LAST_DROP);
        return (false, 0);
    }
}
