// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BaseSetup} from "./BaseSetup.t.sol";
import {ILicenseContract} from "src/interfaces/ILicenseContract.sol";
import {IPrimaryMarketPlace} from "src/interfaces/IPrimaryMarketPlace.sol";
import {
    insufficientPayment,
    cannotBuyYourOwnOffer,
    ContractNotOwner,
    LicenseAddressDifferent
} from "src/errors/SecondaryMarketPlace.sol";

contract SecondaryMarketPlaceTest is BaseSetup {
    function _mintForSecondary()
        internal
        returns (address licenseAddr, uint256 licenseId, uint256 tokenId)
    {
        (licenseAddr, licenseId) = _createLicense(true);
        uint256 total = TOTAL_FEE;
        vm.startPrank(buyer);
        usdc.approve(address(primary), total);
        primary.mintLicense(licenseId, buyer, "ipfs://nft/0");
        vm.stopPrank();
        tokenId = 0;
    }

    function testCreateAndAcceptOfferFlow() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        uint256 price = 10e6; // 10 USDC
        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, price);

        address buyer2 = makeAddr("buyer2");
        usdc.mint(buyer2, 10e6); // Mint 10 USDC to buyer2
        vm.startPrank(buyer2);
        usdc.approve(address(secondary), price);
        secondary.acceptOffer(tokenId);
        vm.stopPrank();

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
        uint256 price = 5e6; // 5 USDC
        secondary.createOffer(tokenId, licenseAddr, price);
        address buyer2 = makeAddr("buyer2");
        usdc.mint(buyer2, 1e6);
        vm.prank(buyer2);
        // Don't approve any tokens - this should cause the transfer to fail
        vm.expectRevert(); // ERC20 will revert with ERC20InsufficientAllowance
        secondary.acceptOffer(tokenId);
    }

    function testAcceptOfferCannotBuyOwnOffer() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();
        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);
        vm.prank(buyer);
        uint256 price = 5e6; // 5 USDC
        secondary.createOffer(tokenId, licenseAddr, price);
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(cannotBuyYourOwnOffer.selector, buyer)
        );
        secondary.acceptOffer(tokenId);
    }

    function testCreateOfferUnapprovedReverts() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();
        vm.prank(buyer);
        vm.expectRevert();
        secondary.createOffer(tokenId, licenseAddr, 5e6); // 5 USDC
    }

    function testRemoveOffer() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();
        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);
        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 5e6); // 5 USDC
        vm.prank(buyer);
        secondary.removeOffer(tokenId);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(ContractNotOwner.selector));
        secondary.removeOffer(tokenId);
    }

    function testCoordinatorRemoveOfferReturnsToSellerAndUpdatesPrimary()
        public
    {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();
        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);
        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 5e6); // 5 USDC

        vm.prank(coordinator);
        secondary.removeOffer(tokenId);

        assertEq(
            ILicenseContract(licenseAddr).ownerOf(tokenId),
            buyer,
            "NFT not returned to seller on coordinator cancel"
        );

        IPrimaryMarketPlace.GameNft memory nftData = primary.getNftDetails(
            tokenId
        );
        assertEq(nftData.listedForSale, false, "listedForSale not reset");
        assertEq(nftData.owner, buyer, "primary owner not reset to seller");

        uint256[] memory userIds = primary.getUserNftIds(buyer);
        bool found;
        for (uint256 i = 0; i < userIds.length; ) {
            if (userIds[i] == tokenId) {
                found = true;
                break;
            }
            unchecked {
                ++i;
            }
        }
        assertTrue(found, "tokenId not re-added to seller's user list");
    }

    function testCreateOfferWrongLicenseAddressReverts() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();
        (address wrongLicenseAddr, ) = _createLicense(true);

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(
                LicenseAddressDifferent.selector,
                wrongLicenseAddr
            )
        );
        secondary.createOffer(tokenId, wrongLicenseAddr, 5e6); // 5 USDC
    }
}
