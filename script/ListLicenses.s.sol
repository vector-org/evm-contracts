// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LicenseFactory} from "src/LicenseFactory.sol";
import {License} from "src/types/Types.sol";

/**
 * @title ListLicenses
 * @notice Utility script to enumerate all licenses in the factory and print their exact on‑chain names & fee splits.
 * @dev Read-only (no broadcast needed). Use this first to capture the precise name strings before crafting updates.
 *
 * Run (example):
 *  forge script script/ListLicenses.s.sol:ListLicenses --rpc-url vector -vvvv
 *
 * Optionally override the factory address by exporting FACTORY_PROXY_ADDRESS env var:
 *  export FACTORY_PROXY_ADDRESS=0xYourFactory
 *  forge script script/ListLicenses.s.sol:ListLicenses --rpc-url vector -vvvv
 */
contract ListLicenses is Script {
    address constant DEFAULT_FACTORY =
        0x2C7548B2BBecF649976D4eEe6c0Ff586fab444b7;

    function run() external view {
        address factoryAddr = DEFAULT_FACTORY;
        try vm.envAddress("FACTORY_PROXY_ADDRESS") returns (address a) {
            if (a != address(0)) {
                factoryAddr = a;
            }
        } catch {}
        console.log("Listing licenses from factory:");
        console.log(factoryAddr);

        LicenseFactory factory = LicenseFactory(factoryAddr);
        uint256[] memory ids = factory.getAllLicenseIds();
        console.log("Total license count:");
        console.log(ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            License memory L = factory.getLicenseFromId(id);
            uint256 total = L.developerFee + L.platformFee;

            console.log("-----------------------------");
            console.log("License ID:");
            console.log(id);
            console.log("Name:");
            console.log(
                bytes(L.name).length > 0 ? L.name : string(abi.encodePacked(""))
            );
            console.log("Symbol:");
            console.log(
                bytes(L.symbol).length > 0
                    ? L.symbol
                    : string(abi.encodePacked(""))
            );
            console.log("Contract Address:");
            console.log(L.contractAddress);
            console.log("Owner:");
            console.log(L.owner);
            console.log("Coordinator:");
            console.log(L.coordinator);
            console.log("Active (1=yes 0=no):");
            console.log(L.isActive ? uint256(1) : uint256(0));
            console.log("Developer Fee (wei):");
            console.log(L.developerFee);
            console.log("Platform Fee (wei):");
            console.log(L.platformFee);
            console.log("Total Fee (wei):");
            console.log(total);
            console.log("URI:");
            console.log(
                bytes(L.uri).length > 0 ? L.uri : string(abi.encodePacked(""))
            );
        }

        console.log("====== END LIST ======");
    }
}
