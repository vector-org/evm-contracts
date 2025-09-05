// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {BaseSetup} from "./BaseSetup.t.sol";
import {ILicenseContract} from "src/interfaces/ILicenseContract.sol";
import {
    licenseNotActive,
    NotSufficientETH
} from "src/errors/PrimaryMarketPlace.sol";
import {LicenseInput} from "src/types/Types.sol";

contract PrimaryMarketPlaceTest is BaseSetup {
    function testMintLicenseDistributesFees() public {
        (address licenseAddr, uint256 licenseId) = _createLicense(true);
        uint256 total = DEV_FEE + PUB_FEE + PLATFORM_FEE;

        uint256 devBefore = developer.balance;
        uint256 pubBefore = publisher.balance;
        uint256 platBefore = platform.balance;

        vm.prank(buyer);
        primary.mintLicense{value: total}(licenseId, buyer, "ipfs://nft/0");

        assertEq(developer.balance, devBefore + DEV_FEE);
        assertEq(publisher.balance, pubBefore + PUB_FEE);
        assertEq(platform.balance, platBefore + PLATFORM_FEE);

        assertEq(ILicenseContract(licenseAddr).ownerOf(0), buyer);
    }

    function testMintInactiveReverts() public {
        (, uint256 licenseId) = _createLicense(false);
        uint256 total = DEV_FEE + PUB_FEE + PLATFORM_FEE;
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(licenseNotActive.selector, licenseId)
        );
        primary.mintLicense{value: total}(licenseId, buyer, "ipfs://nft/0");
    }

    function testMintWrongValueReverts() public {
        (, uint256 licenseId) = _createLicense(true);
        vm.prank(buyer);
        vm.expectRevert();
        primary.mintLicense{value: 1 wei}(licenseId, buyer, "ipfs://nft/0");
    }

    function testMintZeroPriceLicense() public {
        LicenseInput memory input = LicenseInput({
            name: "FreeLicense",
            symbol: "FREE",
            uri: "ipfs://root/free",
            isActive: true,
            developerFee: 0,
            platformFee: 0,
            publisherFee: 0,
            developer: developer,
            publisher: publisher,
            platform: platform,
            primaryMarketplace: address(primary),
            secondaryMarketplace: address(secondary)
        });

        vm.prank(coordinator);
        address licenseAddr = factory.createLicense(input);
        uint256[] memory ids = factory.getAllLicenseIds();
        uint256 licenseId = ids[ids.length - 1];

        uint256 devBefore = developer.balance;
        uint256 pubBefore = publisher.balance;
        uint256 platBefore = platform.balance;

        vm.prank(buyer);
        primary.mintLicense{value: 0}(licenseId, buyer, "ipfs://nft/free0");

        assertEq(developer.balance, devBefore);
        assertEq(publisher.balance, pubBefore);
        assertEq(platform.balance, platBefore);
        assertEq(ILicenseContract(licenseAddr).ownerOf(0), buyer);
    }

    function testMintZeroPriceLicenseWithValueReverts() public {
        LicenseInput memory input = LicenseInput({
            name: "FreeLicense",
            symbol: "FREE",
            uri: "ipfs://root/free",
            isActive: true,
            developerFee: 0,
            platformFee: 0,
            publisherFee: 0,
            developer: developer,
            publisher: publisher,
            platform: platform,
            primaryMarketplace: address(primary),
            secondaryMarketplace: address(secondary)
        });

        vm.prank(coordinator);
        factory.createLicense(input);
        uint256[] memory ids = factory.getAllLicenseIds();
        uint256 licenseId = ids[ids.length - 1];

        uint256 sent = 1 wei;
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(NotSufficientETH.selector, sent, 0)
        );
        primary.mintLicense{value: sent}(licenseId, buyer, "ipfs://nft/free1");
    }
}
