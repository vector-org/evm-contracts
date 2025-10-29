// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "forge-std/Script.sol";
import {LicenseFactory} from "../../src/LicenseFactory.sol";
import {LicenseInput} from "../../src/types/Types.sol";
import {BaseScript} from "../helpers/BaseScript.s.sol";

contract CreateLicense is BaseScript {
    event LicenseCreated(
        string name,
        string symbol,
        uint256 licenseId,
        address licenseAddress
    );

    function run(
        string memory name,
        string memory symbol,
        string memory uri,
        bool isActive,
        uint256 totalFee,
        address developer,
        address publisher,
        address platform
    ) public {
        BaseScript.CoreConfig memory cfg = loadCore();

        LicenseInput memory input = LicenseInput({
            name: name,
            symbol: symbol,
            uri: uri,
            isActive: isActive,
            totalFee: totalFee,
            developer: developer,
            publisher: publisher,
            platform: platform,
            primaryMarketplace: cfg.primaryProxy,
            secondaryMarketplace: cfg.secondaryProxy
        });

        LicenseFactory factory = LicenseFactory(cfg.factoryProxy);

        beginBroadcast(cfg.deployerKey);
        address licenseAddress = factory.createLicense(input);
        endBroadcast();

        uint256[] memory ids = factory.getAllLicenseIds();
        uint256 licenseId = ids[ids.length - 1];

        emit LicenseCreated(name, symbol, licenseId, licenseAddress);
        console.log("Created license contract:");
        console.log("  name: %s", name);
        console.log("  symbol: %s", symbol);
        console.log("  active:", isActive);
        console.log("  total fee (wei):", totalFee);
        console.log("  licenseId:", licenseId);
        console.log("  address:", licenseAddress);
        console.log("  developer:", developer);
        console.log("  publisher:", publisher);
        console.log("  platform:", platform);
        console.log("  primary marketplace:", cfg.primaryProxy);
        console.log("  secondary marketplace:", cfg.secondaryProxy);
    }
}
