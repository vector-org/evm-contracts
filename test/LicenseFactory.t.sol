// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {BaseSetup} from "./BaseSetup.t.sol";
import {LicenseFactory} from "src/LicenseFactory.sol";
import {ILicenseFactory} from "src/interfaces/ILicenseFactory.sol"; // interface used for type parity in some tests
import {LicenseInput} from "src/types/Types.sol";
import {ILicenseContract} from "src/interfaces/ILicenseContract.sol";
import {License} from "src/types/Types.sol";
// import errors for explicit selector usage
import {
    notAdminOrOwner,
    licenseNotFound,
    cannotUpdateLicense
} from "src/errors/LicenseFactory.sol";

contract LicenseFactoryTest is BaseSetup {
    function testCreateLicenseStoresData() public {
        (address licenseAddr, uint256 licenseId) = _createLicense(true);
        License memory L = factory.getLicenseFromID(licenseId);
        assertEq(L.contractAddress, licenseAddr, "contract addr mismatch");
        assertEq(L.owner, coordinator, "owner mismatch");
        assertTrue(L.isActive, "should be active");
    }

    function testChangeLicenseStatusByOwner() public {
        (, uint256 licenseId) = _createLicense(true);
        vm.prank(coordinator); // coordinator is license owner
        factory.changeLicenseStatus(licenseId, false);
        assertFalse(factory.getLicenseFromID(licenseId).isActive);
    }

    function testChangeLicenseStatusByAdmin() public {
        (, uint256 licenseId) = _createLicense(true);
        factory.changeLicenseStatus(licenseId, false); // admin is address(this)
        assertFalse(factory.getLicenseFromID(licenseId).isActive);
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
        // Mint token 0 via primary marketplace so token exists
        uint256 total = DEV_FEE + PUB_FEE + PLATFORM_FEE;
        vm.prank(buyer);
        primary.mintLicense{value: total}(
            licenseId,
            buyer,
            "ipfs://mint/original"
        );

        // Owner (coordinator) updates metadata for token == licenseId (0)
        vm.prank(coordinator);
        factory.updateLicense(licenseId, "ipfs://new/uri");
        assertEq(
            ILicenseContract(licenseAddr).tokenURI(licenseId),
            "ipfs://new/uri"
        );

        // Admin updates again
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
        // first license by original coordinator
        _createLicense(true);
        address newCoord = makeAddr("newCoord");
        vm.prank(admin);
        factory.setCoordinator(newCoord, true);

        // create second license using new coordinator directly (manual to avoid using coordinator var)
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
        License memory L2 = factory.getLicenseFromID(secondId);
        assertEq(L2.contractAddress, license2);
        assertEq(L2.owner, newCoord);
    }
}
