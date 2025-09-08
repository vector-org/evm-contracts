// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BaseSetup} from "./BaseSetup.t.sol";
import {ILicenseContract} from "src/interfaces/ILicenseContract.sol";
import {
    offerInactive,
    insufficientPayment,
    cannotBuyYourOwnOffer
} from "src/errors/SecondaryMarketPlace.sol";

contract SecondaryMarketPlaceTest is BaseSetup {
    function _mintForSecondary()
        internal
        returns (address licenseAddr, uint256 licenseId, uint256 tokenId)
    {
        (licenseAddr, licenseId) = _createLicense(true);
        uint256 total = DEV_FEE + PUB_FEE + PLATFORM_FEE;
        vm.prank(buyer);
        primary.mintLicense{value: total}(licenseId, buyer, "ipfs://nft/0");
        tokenId = 0;
    }

    function testCreateAndAcceptOfferFlow() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        uint256 price = 1 ether;
        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, price);

        address buyer2 = makeAddr("buyer2");
        vm.deal(buyer2, 10 ether);
        vm.prank(buyer2);
        secondary.acceptOffer{value: price}(tokenId);

        assertEq(
            ILicenseContract(licenseAddr).ownerOf(tokenId),
            buyer2,
            "ownership not transferred"
        );
    }

    function testAcceptOfferInsufficientPaymentReverts() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();
        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);
        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 1 ether);
        address buyer2 = makeAddr("buyer2");
        vm.deal(buyer2, 1 ether);
        vm.prank(buyer2);
        vm.expectRevert(
            abi.encodeWithSelector(insufficientPayment.selector, tokenId, 0)
        );
        secondary.acceptOffer{value: 0}(tokenId);
    }

    function testAcceptOfferCannotBuyOwnOffer() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();
        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);
        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 1 ether);
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(cannotBuyYourOwnOffer.selector, buyer)
        );
        secondary.acceptOffer{value: 1 ether}(tokenId);
    }

    function testCreateOfferUnapprovedReverts() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();
        vm.prank(buyer);
        vm.expectRevert();
        secondary.createOffer(tokenId, licenseAddr, 1 ether);
    }

    function testRemoveOffer() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();
        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);
        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 1 ether);
        vm.prank(buyer);
        secondary.removeOffer(tokenId);
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(offerInactive.selector, tokenId)
        );
        secondary.removeOffer(tokenId);
    }
}
