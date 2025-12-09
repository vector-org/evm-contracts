// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BaseSetup} from "./BaseSetup.t.sol";
import {ILicenseContract} from "src/interfaces/ILicenseContract.sol";
import {IPrimaryMarketPlace} from "src/interfaces/IPrimaryMarketPlace.sol";
import {LicenseInput, Offer, License} from "src/types/Types.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ZeroAddressInput} from "src/errors/Common.sol";
import {
    notPrimaryMarketPlace,
    notPrimaryOrSecondary
} from "src/errors/LicenseContract.sol";
import {
    insufficientPayment,
    alreadyListed,
    priceIsInvalid
} from "src/errors/SecondaryMarketPlace.sol";

/**
 * @title SecurityAudit
 * @notice Comprehensive security testing suite following the SOP
 * @dev Tests cover: Access Control, Reentrancy, Payment Safety, Data Consistency, DoS, and Edge Cases
 */
contract SecurityAuditTest is BaseSetup {
    address hacker;
    address seller;

    function setUp() public override {
        super.setUp();
        hacker = makeAddr("hacker");
        seller = makeAddr("seller");
        usdc.mint(seller, 1000e6);
    }

    // ========================================
    // PHASE 2.1: LicenseFactory Security Tests
    // ========================================

    /// @notice Test double initialization prevention (proxy attack)
    function testFactoryDoubleInitializationReverts() public {
        vm.expectRevert();
        factory.initialize(admin);
    }

    /// @notice Test zero address rejection in license creation (marketplace addresses)
    function testFactoryRejectsZeroAddresses() public {
        LicenseInput memory input = LicenseInput({
            name: "Test",
            symbol: "TST",
            uri: "ipfs://test",
            isActive: true,
            totalFee: TOTAL_FEE,
            developer: developer,
            platform: platform,
            primaryMarketplace: address(0), // Zero address for primary marketplace
            secondaryMarketplace: address(secondary)
        });

        vm.prank(coordinator);
        vm.expectRevert(abi.encodeWithSelector(ZeroAddressInput.selector));
        factory.createLicense(input);
    }

    /// @notice Test fee calculation with odd numbers (rounding)
    function testFactoryFeeRoundingLogic() public {
        // Test with 1 wei - should split correctly
        LicenseInput memory input = LicenseInput({
            name: "OddFee",
            symbol: "ODD",
            uri: "ipfs://odd",
            isActive: true,
            totalFee: 1, // 1 wei
            developer: developer,
            platform: platform,
            primaryMarketplace: address(primary),
            secondaryMarketplace: address(secondary)
        });

        vm.prank(coordinator);
        factory.createLicense(input);
        uint256[] memory ids = factory.getAllLicenseIds();
        uint256 licenseId = ids[ids.length - 1];

        License memory lic = factory.getLicenseFromId(licenseId);
        // Platform gets 5% of 1 = 0 (floor division)
        assertEq(lic.platformFee, 0, "platform fee should be 0");
        // Developer gets remainder = 1
        assertEq(lic.developerFee, 1, "developer fee should be 1");
        // Verify no dust
        assertEq(lic.platformFee + lic.developerFee, 1, "fees must sum to total");
    }

    /// @notice Test unauthorized access to license creation
    function testFactoryUnauthorizedCreateReverts() public {
        LicenseInput memory input = LicenseInput({
            name: "Hack",
            symbol: "HCK",
            uri: "ipfs://hack",
            isActive: true,
            totalFee: TOTAL_FEE,
            developer: developer,
            platform: platform,
            primaryMarketplace: address(primary),
            secondaryMarketplace: address(secondary)
        });

        vm.prank(hacker);
        vm.expectRevert();
        factory.createLicense(input);
    }

    // ========================================
    // PHASE 2.2: LicenseContract Security Tests
    // ========================================

    /// @notice Critical: Test P2P transfer blocking (must only transfer via marketplaces)
    function testLicenseContractBlocksP2PTransfers() public {
        // Mint an NFT to buyer
        (address licenseAddr, uint256 licenseId) = _createLicense(true);
        vm.startPrank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        primary.mintLicense(licenseId, buyer, "ipfs://nft/0");
        vm.stopPrank();

        ILicenseContract license = ILicenseContract(licenseAddr);
        address recipient = makeAddr("recipient");

        // Attempt direct transfer (P2P) - should revert
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(notPrimaryOrSecondary.selector, buyer)
        );
        license.transferFrom(buyer, recipient, 0);
    }

    /// @notice Test unauthorized minting (only Primary marketplace can mint)
    function testLicenseContractUnauthorizedMintReverts() public {
        (address licenseAddr, ) = _createLicense(true);
        ILicenseContract license = ILicenseContract(licenseAddr);

        vm.prank(hacker);
        vm.expectRevert(
            abi.encodeWithSelector(notPrimaryMarketPlace.selector, hacker)
        );
        license.safeMint("ipfs://hack", hacker, 999);
    }

    // ========================================
    // PHASE 2.3: PrimaryMarketPlace Security Tests
    // ========================================

    /// @notice Test solvency - buyer with 0 balance
    function testPrimaryMarketplaceInsolventBuyerReverts() public {
        (, uint256 licenseId) = _createLicense(true);
        address poorBuyer = makeAddr("poorBuyer");

        vm.prank(poorBuyer);
        vm.expectRevert();
        primary.mintLicense(licenseId, poorBuyer, "ipfs://nft/0");
    }

    /// @notice Test exact fee distribution (95/5 split)
    function testPrimaryMarketplaceFeeDistributionExact() public {
        (, uint256 licenseId) = _createLicense(true);

        uint256 devBefore = usdc.balanceOf(developer);
        uint256 platBefore = usdc.balanceOf(platform);
        uint256 buyerBefore = usdc.balanceOf(buyer);

        vm.startPrank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        primary.mintLicense(licenseId, buyer, "ipfs://nft/0");
        vm.stopPrank();

        // Verify exact amounts
        assertEq(usdc.balanceOf(developer), devBefore + DEV_FEE, "dev fee mismatch");
        assertEq(usdc.balanceOf(platform), platBefore + PLATFORM_FEE, "platform fee mismatch");
        assertEq(usdc.balanceOf(buyer), buyerBefore - TOTAL_FEE, "buyer payment mismatch");
        
        // Verify no funds stuck in contract
        assertEq(usdc.balanceOf(address(primary)), 0, "funds stuck in contract");
    }

    /// @notice Test tracking consistency after mint
    function testPrimaryMarketplaceTrackingConsistency() public {
        (address licenseAddr, uint256 licenseId) = _createLicense(true);

        uint256 allNftsBefore = primary.getAllNftIds().length;
        uint256 userNftsBefore = primary.getUserNftIds(buyer).length;

        vm.startPrank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        primary.mintLicense(licenseId, buyer, "ipfs://nft/0");
        vm.stopPrank();

        // Verify tracking updates
        assertEq(primary.getAllNftIds().length, allNftsBefore + 1, "allNftIds not updated");
        assertEq(primary.getUserNftIds(buyer).length, userNftsBefore + 1, "userNftIds not updated");

        // Verify gameNfts mapping
        IPrimaryMarketPlace.GameNft memory nft = primary.getNftDetails(0);
        assertEq(nft.owner, buyer, "owner mismatch");
        assertEq(nft.licenseAddress, licenseAddr, "license address mismatch");
        assertFalse(nft.listedForSale, "should not be listed");
    }

    // ========================================
    // PHASE 2.4: SecondaryMarketplace Security Tests
    // ========================================

    /// @notice Test escrow mechanism - NFT held by marketplace
    function testSecondaryMarketplaceEscrowMechanism() public {
        uint256 tokenId = _mintAndApproveForSecondary();
        address licenseAddr = primary.getNftDetails(tokenId).licenseAddress;

        uint256 price = 5e6;
        vm.prank(seller);
        secondary.createOffer(tokenId, licenseAddr, price);

        // Verify NFT is in escrow
        assertEq(
            ILicenseContract(licenseAddr).ownerOf(tokenId),
            address(secondary),
            "NFT not in escrow"
        );

        // Verify offer is active
        Offer memory offer = secondary.getOffer(tokenId);
        assertTrue(offer.isActive, "offer should be active");
        assertEq(offer.seller, seller, "seller mismatch");
        assertEq(offer.price, price, "price mismatch");
    }

    /// @notice Test price guards (0 and MAX_PRICE)
    function testSecondaryMarketplacePriceGuards() public {
        uint256 tokenId = _mintAndApproveForSecondary();
        address licenseAddr = primary.getNftDetails(tokenId).licenseAddress;

        // Test price = 0
        vm.prank(seller);
        vm.expectRevert(abi.encodeWithSelector(priceIsInvalid.selector, 0));
        secondary.createOffer(tokenId, licenseAddr, 0);

        // Test price > MAX_PRICE
        uint256 tooHigh = type(uint256).max;
        vm.prank(seller);
        vm.expectRevert(abi.encodeWithSelector(priceIsInvalid.selector, tooHigh));
        secondary.createOffer(tokenId, licenseAddr, tooHigh);
    }

    /// @notice Test double listing prevention
    function testSecondaryMarketplaceDoubleListingReverts() public {
        uint256 tokenId = _mintAndApproveForSecondary();
        address licenseAddr = primary.getNftDetails(tokenId).licenseAddress;

        uint256 price = 5e6;
        vm.prank(seller);
        secondary.createOffer(tokenId, licenseAddr, price);

        // Try to list again - should revert
        vm.prank(seller);
        vm.expectRevert(abi.encodeWithSelector(alreadyListed.selector, tokenId));
        secondary.createOffer(tokenId, licenseAddr, price);
    }

    /// @notice Test payment flow - buyer pays, seller receives
    function testSecondaryMarketplacePaymentFlow() public {
        uint256 tokenId = _mintAndApproveForSecondary();
        address licenseAddr = primary.getNftDetails(tokenId).licenseAddress;

        uint256 price = 10e6;
        vm.prank(seller);
        secondary.createOffer(tokenId, licenseAddr, price);

        address buyer2 = makeAddr("buyer2");
        usdc.mint(buyer2, 20e6);

        uint256 sellerBefore = usdc.balanceOf(seller);
        uint256 buyer2Before = usdc.balanceOf(buyer2);

        vm.startPrank(buyer2);
        usdc.approve(address(secondary), price);
        secondary.acceptOffer(tokenId);
        vm.stopPrank();

        // Verify payment
        assertEq(usdc.balanceOf(seller), sellerBefore + price, "seller didn't receive payment");
        assertEq(usdc.balanceOf(buyer2), buyer2Before - price, "buyer2 didn't pay");
        
        // Verify no funds stuck
        assertEq(usdc.balanceOf(address(secondary)), 0, "funds stuck in secondary");

        // Verify NFT transferred
        assertEq(ILicenseContract(licenseAddr).ownerOf(tokenId), buyer2, "NFT not transferred");
    }

    // ========================================
    // PHASE 4: Security & Vulnerability Tests
    // ========================================

    /// @notice Test paused state blocks all operations
    function testPausedStateBlocksOperations() public {
        (, uint256 licenseId) = _createLicense(true);

        // Pause all contracts
        vm.startPrank(admin);
        factory.pause();
        primary.pause();
        secondary.pause();
        vm.stopPrank();

        // Test factory operations
        LicenseInput memory input = LicenseInput({
            name: "Test",
            symbol: "TST",
            uri: "ipfs://test",
            isActive: true,
            totalFee: TOTAL_FEE,
            developer: developer,
            platform: platform,
            primaryMarketplace: address(primary),
            secondaryMarketplace: address(secondary)
        });
        vm.prank(coordinator);
        vm.expectRevert();
        factory.createLicense(input);

        // Test primary marketplace
        vm.startPrank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        vm.expectRevert();
        primary.mintLicense(licenseId, buyer, "ipfs://nft/0");
        vm.stopPrank();

        // Unpause and verify operations work
        vm.startPrank(admin);
        factory.unpause();
        primary.unpause();
        secondary.unpause();
        vm.stopPrank();

        vm.startPrank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        primary.mintLicense(licenseId, buyer, "ipfs://nft/0");
        vm.stopPrank();

        assertEq(ILicenseContract(primary.getNftDetails(0).licenseAddress).ownerOf(0), buyer);
    }

    /// @notice Test unauthorized pause attempts
    function testUnauthorizedPauseReverts() public {
        vm.prank(hacker);
        vm.expectRevert();
        primary.pause();

        vm.prank(hacker);
        vm.expectRevert();
        secondary.pause();

        vm.prank(hacker);
        vm.expectRevert();
        factory.pause();
    }

    /// @notice Test data consistency between primary marketplace and license contract
    function testDataConsistencyAcrossContracts() public {
        (address licenseAddr, uint256 licenseId) = _createLicense(true);

        vm.startPrank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        primary.mintLicense(licenseId, buyer, "ipfs://nft/0");
        vm.stopPrank();

        // Verify consistency
        ILicenseContract license = ILicenseContract(licenseAddr);
        IPrimaryMarketPlace.GameNft memory nftData = primary.getNftDetails(0);

        assertEq(license.ownerOf(0), buyer, "license contract owner mismatch");
        assertEq(nftData.owner, buyer, "primary marketplace owner mismatch");
        assertEq(license.ownerOf(0), nftData.owner, "ownership data inconsistent");
    }

    /// @notice Test insufficient allowance (buyer has funds but no approval)
    function testPrimaryMarketplaceInsufficientAllowance() public {
        (, uint256 licenseId) = _createLicense(true);
        address richBuyer = makeAddr("richBuyer");
        usdc.mint(richBuyer, 100e6);

        // Has funds but no approval
        vm.prank(richBuyer);
        vm.expectRevert(); // ERC20 will revert
        primary.mintLicense(licenseId, richBuyer, "ipfs://nft/0");
    }

    /// @notice Test payment token update capability
    function testPaymentTokenUpdate() public {
        address newToken = makeAddr("newUSDT");
        
        // Update payment token
        vm.prank(admin);
        primary.setPaymentToken(newToken);
        
        assertEq(primary.paymentToken(), newToken, "payment token not updated");

        // Same for secondary
        vm.prank(admin);
        secondary.setPaymentToken(newToken);
        
        assertEq(secondary.paymentToken(), newToken, "secondary payment token not updated");
    }

    /// @notice Test payment token cannot be set to zero address
    function testPaymentTokenZeroAddressReverts() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(ZeroAddressInput.selector));
        primary.setPaymentToken(address(0));

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(ZeroAddressInput.selector));
        secondary.setPaymentToken(address(0));
    }

    // ========================================
    // Helper Functions
    // ========================================

    /// @notice Helper to mint an NFT and approve for secondary marketplace
    function _mintAndApproveForSecondary() internal returns (uint256 tokenId) {
        (address licenseAddr, uint256 licenseId) = _createLicense(true);
        
        vm.startPrank(seller);
        usdc.approve(address(primary), TOTAL_FEE);
        primary.mintLicense(licenseId, seller, "ipfs://nft/0");
        
        IERC721(licenseAddr).setApprovalForAll(address(secondary), true);
        vm.stopPrank();
        
        return 0;
    }
}
