// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BaseSetup} from "./BaseSetup.t.sol";
import {ILicenseContract} from "src/interfaces/ILicenseContract.sol";
import {IPrimaryMarketPlace} from "src/interfaces/IPrimaryMarketPlace.sol";
import {ISecondaryMarketPlace} from "src/interfaces/ISecondaryMarketPlace.sol";
import {Offer} from "src/types/Types.sol";
import {
    insufficientPayment,
    cannotBuyYourOwnOffer,
    ContractNotOwner,
    LicenseAddressDifferent,
    offerInactive,
    notSeller,
    priceIsInvalid
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

    // ============ editOffer Tests ============

    function testEditOfferSuccess() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        uint256 initialPrice = 10e6; // 10 USDC
        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, initialPrice);

        uint256 newPrice = 15e6; // 15 USDC
        vm.prank(buyer);
        secondary.editOffer(tokenId, newPrice);

        // Verify price updated in offerById mapping
        Offer memory offer = secondary.getOffer(tokenId);
        assertEq(offer.price, newPrice, "offerById price not updated");
        assertEq(offer.isActive, true, "offer should still be active");
        assertEq(offer.seller, buyer, "seller should remain unchanged");

        // Verify price updated in offers array
        Offer[] memory allOffers = secondary.getOffers();
        assertEq(allOffers[0].price, newPrice, "offers array price not updated");
    }

    function testEditOfferEmitsEvent() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        uint256 initialPrice = 10e6;
        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, initialPrice);

        uint256 newPrice = 20e6;
        vm.prank(buyer);
        vm.expectEmit(true, true, false, true, address(secondary));
        emit ISecondaryMarketPlace.OfferUpdated(
            buyer,
            tokenId,
            initialPrice,
            newPrice,
            block.timestamp
        );
        secondary.editOffer(tokenId, newPrice);
    }

    function testEditOfferInactiveOfferReverts() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 10e6);

        // Remove the offer (makes it inactive)
        vm.prank(buyer);
        secondary.removeOffer(tokenId);

        // Try to edit inactive offer
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(offerInactive.selector, tokenId));
        secondary.editOffer(tokenId, 15e6);
    }

    function testEditOfferNotSellerReverts() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 10e6);

        // Try to edit as non-seller
        address attacker = makeAddr("attacker");
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(notSeller.selector, attacker));
        secondary.editOffer(tokenId, 15e6);
    }

    function testEditOfferCoordinatorCannotEdit() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 10e6);

        // Coordinator should NOT be able to edit price (unlike remove)
        vm.prank(coordinator);
        vm.expectRevert(abi.encodeWithSelector(notSeller.selector, coordinator));
        secondary.editOffer(tokenId, 15e6);
    }

    function testEditOfferZeroPriceReverts() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 10e6);

        // Try to set price to zero
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(priceIsInvalid.selector, 0));
        secondary.editOffer(tokenId, 0);
    }

    function testEditOfferExceedsMaxPriceReverts() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 10e6);

        // Try to set price above MAX_PRICE (100 ether as defined in Addresses.sol)
        uint256 tooHighPrice = 100 ether + 1;
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(priceIsInvalid.selector, tooHighPrice));
        secondary.editOffer(tokenId, tooHighPrice);
    }

    function testEditOfferWhenPausedReverts() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 10e6);

        // Pause the contract
        vm.prank(admin);
        secondary.pause();

        // Try to edit while paused
        vm.prank(buyer);
        vm.expectRevert(); // EnforcedPause error
        secondary.editOffer(tokenId, 15e6);
    }

    function testEditOfferMultipleTimes() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 10e6);

        // Edit multiple times
        uint256[] memory prices = new uint256[](3);
        prices[0] = 15e6;
        prices[1] = 5e6;
        prices[2] = 25e6;

        for (uint256 i = 0; i < prices.length; i++) {
            vm.prank(buyer);
            secondary.editOffer(tokenId, prices[i]);
            
            Offer memory offer = secondary.getOffer(tokenId);
            assertEq(offer.price, prices[i], "price not updated correctly");
        }
    }

    function testEditOfferThenAccept() public {
        (address licenseAddr, , uint256 tokenId) = _mintForSecondary();

        vm.prank(buyer);
        ILicenseContract(licenseAddr).approve(address(secondary), tokenId);

        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 10e6);

        // Edit the price
        uint256 newPrice = 20e6;
        vm.prank(buyer);
        secondary.editOffer(tokenId, newPrice);

        // Another buyer accepts at new price
        address buyer2 = makeAddr("buyer2");
        usdc.mint(buyer2, 25e6);
        
        vm.startPrank(buyer2);
        usdc.approve(address(secondary), newPrice);
        secondary.acceptOffer(tokenId);
        vm.stopPrank();

        // Verify ownership transferred
        assertEq(
            ILicenseContract(licenseAddr).ownerOf(tokenId),
            buyer2,
            "ownership not transferred"
        );

        // Verify seller received the new price
        assertEq(usdc.balanceOf(buyer), 1000e6 - TOTAL_FEE + newPrice, "seller did not receive correct payment");
    }

    function testEditOfferDoesNotAffectOtherOffers() public {
        // Create two offers
        (address licenseAddr1, , uint256 tokenId1) = _mintForSecondary();
        
        // Create second license and mint
        (address licenseAddr2, uint256 licenseId2) = _createLicense(true);
        address buyer2 = makeAddr("buyer2");
        usdc.mint(buyer2, 1000e6);
        vm.startPrank(buyer2);
        usdc.approve(address(primary), TOTAL_FEE);
        primary.mintLicense(licenseId2, buyer2, "ipfs://nft/1");
        vm.stopPrank();
        uint256 tokenId2 = 1;

        // Create both offers
        vm.prank(buyer);
        ILicenseContract(licenseAddr1).approve(address(secondary), tokenId1);
        vm.prank(buyer);
        secondary.createOffer(tokenId1, licenseAddr1, 10e6);

        vm.prank(buyer2);
        ILicenseContract(licenseAddr2).approve(address(secondary), tokenId2);
        vm.prank(buyer2);
        secondary.createOffer(tokenId2, licenseAddr2, 15e6);

        // Edit first offer
        vm.prank(buyer);
        secondary.editOffer(tokenId1, 25e6);

        // Verify second offer unchanged
        Offer memory offer2 = secondary.getOffer(tokenId2);
        assertEq(offer2.price, 15e6, "second offer price should be unchanged");
    }
}
