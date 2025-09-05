// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {BaseSetup} from "./BaseSetup.t.sol";
import {LicenseFactory} from "src/LicenseFactory.sol";
import {ILicenseFactory} from "src/interfaces/ILicenseFactory.sol";
import {LicenseInput} from "src/types/Types.sol";
import {ILicenseContract} from "src/interfaces/ILicenseContract.sol";
import {License} from "src/types/Types.sol";

import {
    notAdminOrOwner,
    licenseNotFound,
    cannotUpdateLicense
} from "src/errors/LicenseFactory.sol";

contract LicenseFactoryTest is BaseSetup {
    function testCreateLicenseStoresData() public {
        (address licenseAddr, uint256 licenseId) = _createLicense(true);
        License memory L = factory.getLicenseFromId(licenseId);
        assertEq(L.contractAddress, licenseAddr, "contract addr mismatch");
        assertEq(L.owner, coordinator, "owner mismatch");
        // assertEq(L.coordinator, coordinator, "coordinator mismatch");
        assertEq(L.name, "TestLicense", "name mismatch");
        assertEq(L.symbol, "TL", "symbol mismatch");
        assertEq(L.uri, "ipfs://root/0", "uri mismatch");
        assertTrue(L.isActive, "should be active");
        assertEq(L.developerFee, DEV_FEE, "developer fee mismatch");
        assertEq(L.platformFee, PLATFORM_FEE, "platform fee mismatch");
        assertEq(L.publisherFee, PUB_FEE, "publisher fee mismatch");
        assertEq(L.developer, developer, "developer address mismatch");
        assertEq(L.publisher, publisher, "publisher address mismatch");
        assertEq(L.platform, platform, "platform address mismatch");
        assertGt(L.timestamp, 0, "timestamp should be greater than 0");
    }

    function testChangeLicenseStatusByOwner() public {
        (, uint256 licenseId) = _createLicense(true);
        vm.prank(coordinator);
        factory.changeLicenseStatus(licenseId, false);
        assertFalse(factory.getLicenseFromId(licenseId).isActive);
    }

    function testChangeLicenseStatusByAdmin() public {
        (, uint256 licenseId) = _createLicense(true);
        vm.prank(admin);
        factory.changeLicenseStatus(licenseId, false);
        assertFalse(factory.getLicenseFromId(licenseId).isActive);
    }

    function testChangeLicenseStatusUnauthorizedReverts() public {
        (, uint256 licenseId) = _createLicense(true);
        address attacker = makeAddr("attacker");
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(notAdminOrOwner.selector, attacker)
        );
        factory.changeLicenseStatus(licenseId, false);
    }

    function testUpdateLicenseURIByOwnerAndAdmin() public {
        (address licenseAddr, uint256 licenseId) = _createLicense(true);

        uint256 total = DEV_FEE + PUB_FEE + PLATFORM_FEE;
        vm.prank(buyer);
        primary.mintLicense{value: total}(
            licenseId,
            buyer,
            "ipfs://mint/original"
        );

        vm.prank(coordinator);
        factory.updateLicense(licenseId, "ipfs://new/uri");
        assertEq(
            ILicenseContract(licenseAddr).tokenURI(licenseId),
            "ipfs://new/uri"
        );

        factory.updateLicense(licenseId, "ipfs://new/uri2");
        assertEq(
            ILicenseContract(licenseAddr).tokenURI(licenseId),
            "ipfs://new/uri2"
        );
    }

    function testUpdateLicenseUnauthorizedReverts() public {
        (, uint256 licenseId) = _createLicense(true);
        address attacker = makeAddr("attacker");
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(cannotUpdateLicense.selector, attacker)
        );
        factory.updateLicense(licenseId, "ipfs://bad");
    }

    function testUpdateLicenseNonexistentReverts() public {
        address attacker = makeAddr("attacker");
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(licenseNotFound.selector, 999));
        factory.updateLicense(999, "ipfs://nope");
    }

    function testSetCoordinatorFlow() public {
        _createLicense(true);
        address newCoord = makeAddr("newCoord");
        vm.prank(admin);
        factory.setCoordinator(newCoord, true);

        LicenseInput memory input = LicenseInput({
            name: "TestLicense2",
            symbol: "TL2",
            uri: "ipfs://root/1",
            isActive: true,
            developerFee: DEV_FEE,
            platformFee: PLATFORM_FEE,
            publisherFee: PUB_FEE,
            developer: developer,
            publisher: publisher,
            platform: platform,
            primaryMarketplace: address(primary),
            secondaryMarketplace: address(secondary)
        });
        vm.prank(newCoord);
        address license2 = factory.createLicense(input);
        uint256[] memory ids = factory.getAllLicenseIds();
        uint256 secondId = ids[ids.length - 1];
        License memory L2 = factory.getLicenseFromId(secondId);
        assertEq(L2.contractAddress, license2);
        assertEq(L2.owner, newCoord);
    }
}
