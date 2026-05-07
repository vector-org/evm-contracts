// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BaseSetup} from "./BaseSetup.t.sol";
import {ILicenseContract} from "src/interfaces/ILicenseContract.sol";
import {IPrimaryMarketPlace} from "src/interfaces/IPrimaryMarketPlace.sol";
import {LicenseInput, Offer, License} from "src/types/Types.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IntegrationFlows
 * @notice End-to-end integration tests simulating real-world user journeys
 * @dev Tests complete flows: Game Release → Mint → List → Buy → Delist
 */
contract IntegrationFlowsTest is BaseSetup {
    address userA;
    address userB;
    address userC;

    function setUp() public override {
        super.setUp();
        userA = makeAddr("userA");
        userB = makeAddr("userB");
        userC = makeAddr("userC");
        
        usdc.mint(userA, 1000e6);
        usdc.mint(userB, 1000e6);
        usdc.mint(userC, 1000e6);
    }

    // ========================================
    // PHASE 3: Integration Testing
    // ========================================

    /// @notice Flow 1: Complete "Game Release" flow
    /// Admin → Coordinator → License → User Mint → Verify State
    function testGameReleaseFlow() public {
        // 1. Admin initializes system (already done in setUp)
        assertEq(factory.owner(), admin, "factory owner should be admin");
        assertEq(primary.owner(), admin, "primary owner should be admin");
        assertEq(secondary.owner(), admin, "secondary owner should be admin");

        // 2. Admin sets coordinator (already done in setUp via BaseSetup)

        // 3. Coordinator creates license (game release)
        LicenseInput memory input = LicenseInput({
            name: "Epic Game",
            symbol: "EPIC",
            uri: "ipfs://epic/metadata",
            isActive: true,
            totalFee: 50e6, // 50 USDC
            developer: developer,
            platform: platform,
            primaryMarketplace: address(primary),
            secondaryMarketplace: address(secondary)
        });

        vm.prank(coordinator);
        address licenseAddr = factory.createLicense(input);
        uint256[] memory ids = factory.getAllLicenseIds();
        uint256 licenseId = ids[ids.length - 1];

        // Verify license data
        License memory lic = factory.getLicenseFromId(licenseId);
        assertEq(lic.name, "Epic Game", "license name mismatch");
        assertEq(lic.contractAddress, licenseAddr, "license address mismatch");
        assertTrue(lic.isActive, "license should be active");

        // 4. User A mints the game license
        uint256 devBalanceBefore = usdc.balanceOf(developer);
        uint256 platBalanceBefore = usdc.balanceOf(platform);

        vm.startPrank(userA);
        usdc.approve(address(primary), 50e6);
        primary.mintLicense(licenseId, userA, "ipfs://userA/game");
        vm.stopPrank();

        // 5. Verify complete state
        uint256 tokenId = 0;
        
        // A. User owns NFT
        assertEq(ILicenseContract(licenseAddr).ownerOf(tokenId), userA, "userA should own NFT");
        
        // B. Dev/Platform got paid (50 USDC * 0.95 = 47.5, 50 * 0.05 = 2.5)
        assertEq(usdc.balanceOf(developer) - devBalanceBefore, 47.5e6, "dev fee mismatch");
        assertEq(usdc.balanceOf(platform) - platBalanceBefore, 2.5e6, "platform fee mismatch");
        
        // C. Tracking updated
        IPrimaryMarketPlace.GameNft memory nft = primary.getNftDetails(tokenId);
        assertEq(nft.owner, userA, "primary should track userA as owner");
        assertFalse(nft.listedForSale, "should not be listed");
        
        // D. User's NFT list updated
        uint256[] memory userNfts = primary.getUserNftIds(userA);
        assertEq(userNfts.length, 1, "userA should have 1 NFT");
        assertEq(userNfts[0], tokenId, "token ID should match");
    }

    /// @notice Flow 2: Complete "Resale" flow
    /// Mint → List → Buy → Verify Ownership Transfer
    function testResaleFlow() public {
        // 1. Setup: Create license and mint to userA
        (address licenseAddr, uint256 licenseId) = _createLicense(true);
        
        vm.startPrank(userA);
        usdc.approve(address(primary), TOTAL_FEE);
        primary.mintLicense(licenseId, userA, "ipfs://userA/nft");
        vm.stopPrank();

        uint256 tokenId = 0;
        ILicenseContract license = ILicenseContract(licenseAddr);

        // 2. UserA approves secondary marketplace
        vm.prank(userA);
        IERC721(licenseAddr).setApprovalForAll(address(secondary), true);

        // 3. UserA lists NFT for 200 USDC
        uint256 listPrice = 200e6;
        vm.prank(userA);
        secondary.createOffer(tokenId, licenseAddr, listPrice);

        // Verify NFT is in escrow
        assertEq(license.ownerOf(tokenId), address(secondary), "NFT should be in secondary escrow");
        
        // Verify primary marketplace tracking
        IPrimaryMarketPlace.GameNft memory nftData = primary.getNftDetails(tokenId);
        assertTrue(nftData.listedForSale, "should be marked as listed");
        
        // Verify offer active
        Offer memory offer = secondary.getOffer(tokenId);
        assertTrue(offer.isActive, "offer should be active");
        assertEq(offer.seller, userA, "seller should be userA");
        assertEq(offer.price, listPrice, "price should match");

        // 4. UserB buys NFT
        uint256 userABalanceBefore = usdc.balanceOf(userA);
        uint256 userBBalanceBefore = usdc.balanceOf(userB);

        vm.startPrank(userB);
        usdc.approve(address(secondary), listPrice);
        secondary.acceptOffer(tokenId);
        vm.stopPrank();

        // 5. Verify complete state after purchase
        
        // A. UserB owns NFT
        assertEq(license.ownerOf(tokenId), userB, "userB should own NFT");
        
        // B. UserA received payment
        assertEq(
            usdc.balanceOf(userA) - userABalanceBefore,
            listPrice,
            "userA should receive full sale price"
        );
        
        // C. UserB paid
        assertEq(
            userBBalanceBefore - usdc.balanceOf(userB),
            listPrice,
            "userB should have paid list price"
        );
        
        // D. Primary marketplace data reflects userB as owner
        nftData = primary.getNftDetails(tokenId);
        assertEq(nftData.owner, userB, "primary should show userB as owner");
        assertFalse(nftData.listedForSale, "should not be listed anymore");
        
        // E. UserB's NFT list updated
        uint256[] memory userBNfts = primary.getUserNftIds(userB);
        assertEq(userBNfts.length, 1, "userB should have 1 NFT");
        assertEq(userBNfts[0], tokenId, "token ID should match");
        
        // F. UserA's NFT list should be empty (removed during listing)
        uint256[] memory userANfts = primary.getUserNftIds(userA);
        assertEq(userANfts.length, 0, "userA should have 0 NFTs");
        
        // G. Offer marked inactive
        offer = secondary.getOffer(tokenId);
        assertFalse(offer.isActive, "offer should be inactive");
        assertEq(offer.buyer, userB, "buyer should be recorded");
    }

    /// @notice Flow 3: Complete "Delisting" flow
    /// Mint → List → Change Mind → Delist → Verify Return
    function testDelistingFlow() public {
        // 1. Setup: Create license and mint to userB
        (address licenseAddr, uint256 licenseId) = _createLicense(true);
        
        vm.startPrank(userB);
        usdc.approve(address(primary), TOTAL_FEE);
        primary.mintLicense(licenseId, userB, "ipfs://userB/nft");
        vm.stopPrank();

        uint256 tokenId = 0;
        ILicenseContract license = ILicenseContract(licenseAddr);

        // 2. UserB lists NFT
        vm.prank(userB);
        IERC721(licenseAddr).setApprovalForAll(address(secondary), true);

        uint256 listPrice = 100e6;
        vm.prank(userB);
        secondary.createOffer(tokenId, licenseAddr, listPrice);

        // Verify listing state
        assertEq(license.ownerOf(tokenId), address(secondary), "NFT should be in escrow");
        assertTrue(secondary.getOffer(tokenId).isActive, "offer should be active");

        // 3. UserB changes mind and removes listing
        vm.prank(userB);
        secondary.removeOffer(tokenId);

        // 4. Verify NFT returned to userB
        assertEq(license.ownerOf(tokenId), userB, "NFT should be returned to userB");
        
        // 5. Verify offer deactivated
        Offer memory offer = secondary.getOffer(tokenId);
        assertFalse(offer.isActive, "offer should be inactive");
        
        // 6. Verify primary marketplace updated
        IPrimaryMarketPlace.GameNft memory nftData = primary.getNftDetails(tokenId);
        assertFalse(nftData.listedForSale, "should not be marked as listed");
        assertEq(nftData.owner, userB, "owner should still be userB");
        
        // 7. Verify userB's NFT list restored
        uint256[] memory userBNfts = primary.getUserNftIds(userB);
        assertEq(userBNfts.length, 1, "userB should have NFT back in list");
        assertEq(userBNfts[0], tokenId, "token ID should match");
    }

    /// @notice Flow 4: Multiple sales chain
    /// A → B → C (sequential resales)
    function testMultipleSalesChain() public {
        // 1. Mint to userA
        (address licenseAddr, uint256 licenseId) = _createLicense(true);
        vm.startPrank(userA);
        usdc.approve(address(primary), TOTAL_FEE);
        primary.mintLicense(licenseId, userA, "ipfs://nft");
        vm.stopPrank();

        uint256 tokenId = 0;
        ILicenseContract license = ILicenseContract(licenseAddr);

        // 2. A sells to B for 50 USDC
        vm.prank(userA);
        IERC721(licenseAddr).setApprovalForAll(address(secondary), true);
        
        vm.prank(userA);
        secondary.createOffer(tokenId, licenseAddr, 50e6);

        vm.startPrank(userB);
        usdc.approve(address(secondary), 50e6);
        secondary.acceptOffer(tokenId);
        vm.stopPrank();

        assertEq(license.ownerOf(tokenId), userB, "userB should own after first sale");

        // 3. B sells to C for 75 USDC
        vm.prank(userB);
        IERC721(licenseAddr).setApprovalForAll(address(secondary), true);
        
        vm.prank(userB);
        secondary.createOffer(tokenId, licenseAddr, 75e6);

        vm.startPrank(userC);
        usdc.approve(address(secondary), 75e6);
        secondary.acceptOffer(tokenId);
        vm.stopPrank();

        // 4. Verify final state
        assertEq(license.ownerOf(tokenId), userC, "userC should own after second sale");
        
        IPrimaryMarketPlace.GameNft memory nftData = primary.getNftDetails(tokenId);
        assertEq(nftData.owner, userC, "primary should track userC");
        
        uint256[] memory userCNfts = primary.getUserNftIds(userC);
        assertEq(userCNfts.length, 1, "userC should have 1 NFT");
    }

    /// @notice Flow 5: Coordinator moderation (remove offer on behalf of seller)
    function testCoordinatorModerationFlow() public {
        // 1. Setup: userA lists an NFT
        (address licenseAddr, uint256 licenseId) = _createLicense(true);
        
        vm.startPrank(userA);
        usdc.approve(address(primary), TOTAL_FEE);
        primary.mintLicense(licenseId, userA, "ipfs://userA/nft");
        vm.stopPrank();

        uint256 tokenId = 0;
        ILicenseContract license = ILicenseContract(licenseAddr);

        vm.prank(userA);
        IERC721(licenseAddr).setApprovalForAll(address(secondary), true);

        vm.prank(userA);
        secondary.createOffer(tokenId, licenseAddr, 100e6);

        // 2. Coordinator removes offer (moderation action)
        vm.prank(coordinator);
        secondary.removeOffer(tokenId);

        // 3. Verify NFT returned to userA
        assertEq(license.ownerOf(tokenId), userA, "NFT should be returned to userA");
        assertFalse(secondary.getOffer(tokenId).isActive, "offer should be inactive");
        
        // 4. Verify primary marketplace state restored
        IPrimaryMarketPlace.GameNft memory nftData = primary.getNftDetails(tokenId);
        assertFalse(nftData.listedForSale, "should not be listed");
        assertEq(nftData.owner, userA, "owner should be userA");
    }

    /// @notice Flow 6: Batch minting (single user mints multiple licenses)
    function testBatchMintingFlow() public {
        // Create 3 different licenses
        (address license1Addr, uint256 license1Id) = _createLicense(true);
        
        LicenseInput memory input2 = LicenseInput({
            name: "License2",
            symbol: "L2",
            uri: "ipfs://license2",
            isActive: true,
            totalFee: TOTAL_FEE,
            developer: developer,
            platform: platform,
            primaryMarketplace: address(primary),
            secondaryMarketplace: address(secondary)
        });
        vm.prank(coordinator);
        address license2Addr = factory.createLicense(input2);
        uint256[] memory ids = factory.getAllLicenseIds();
        uint256 license2Id = ids[ids.length - 1];

        LicenseInput memory input3 = LicenseInput({
            name: "License3",
            symbol: "L3",
            uri: "ipfs://license3",
            isActive: true,
            totalFee: TOTAL_FEE,
            developer: developer,
            platform: platform,
            primaryMarketplace: address(primary),
            secondaryMarketplace: address(secondary)
        });
        vm.prank(coordinator);
        address license3Addr = factory.createLicense(input3);
        ids = factory.getAllLicenseIds();
        uint256 license3Id = ids[ids.length - 1];

        // UserA mints all 3
        vm.startPrank(userA);
        usdc.approve(address(primary), TOTAL_FEE * 3);
        
        primary.mintLicense(license1Id, userA, "ipfs://userA/nft0");
        primary.mintLicense(license2Id, userA, "ipfs://userA/nft1");
        primary.mintLicense(license3Id, userA, "ipfs://userA/nft2");
        vm.stopPrank();

        // Verify userA owns all 3 NFTs
        assertEq(ILicenseContract(license1Addr).ownerOf(0), userA);
        assertEq(ILicenseContract(license2Addr).ownerOf(1), userA);
        assertEq(ILicenseContract(license3Addr).ownerOf(2), userA);

        // Verify tracking
        uint256[] memory userANfts = primary.getUserNftIds(userA);
        assertEq(userANfts.length, 3, "userA should have 3 NFTs");
        
        uint256[] memory allNfts = primary.getAllNftIds();
        assertGe(allNfts.length, 3, "should have at least 3 NFTs");
    }
}
