// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BaseSetup} from "./BaseSetup.t.sol";
import {ILicenseContract} from "src/interfaces/ILicenseContract.sol";
import {LicenseContract} from "src/LicenseContract.sol";
import {IERC5192} from "src/interfaces/IERC5192.sol";
import {TokenLocked} from "src/errors/LicenseContract.sol";
import {TokenIsSoulbound} from "src/errors/SecondaryMarketPlace.sol";

/**
 * @title SoulboundTest
 * @notice Tests for ERC-5192 soulbound (non-transferable) token functionality
 */
contract SoulboundTest is BaseSetup {
    address internal licenseAddr;
    uint256 internal licenseId;
    address internal legacyUser;

    function setUp() public override {
        super.setUp();
        (licenseAddr, licenseId) = _createLicense(true);
        legacyUser = makeAddr("legacyUser");
        
        // Set mint authority to admin for testing
        vm.prank(admin);
        primary.setMintAuthority(admin);
    }

    /*//////////////////////////////////////////////////////////////
                            SOULBOUND MINT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AdminMintTo_CreatesSoulboundToken() public {
        // Mint via adminMintTo (Steam Legacy)
        vm.prank(admin);
        primary.adminMintTo(licenseId, legacyUser, "ipfs://legacy/1");

        // Verify token exists and is owned by legacyUser
        ILicenseContract license = ILicenseContract(licenseAddr);
        assertEq(license.ownerOf(0), legacyUser);

        // Verify token is locked (soulbound)
        assertTrue(license.locked(0), "Token should be locked");
    }

    function test_AdminMintTo_EmitsLockedEvent() public {
        ILicenseContract license = ILicenseContract(licenseAddr);
        
        vm.expectEmit(true, false, false, false, licenseAddr);
        emit IERC5192.Locked(0);

        vm.prank(admin);
        primary.adminMintTo(licenseId, legacyUser, "ipfs://legacy/1");
    }

    function test_NormalMint_CreatesTransferableToken() public {
        // Approve USDC for buyer
        vm.prank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);

        // Mint via normal mintLicense
        vm.prank(buyer);
        primary.mintLicense(licenseId, buyer, "ipfs://normal/1");

        // Verify token is NOT locked
        ILicenseContract license = ILicenseContract(licenseAddr);
        assertFalse(license.locked(0), "Normal mint should not be locked");
    }

    /*//////////////////////////////////////////////////////////////
                        TRANSFER RESTRICTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SoulboundToken_CannotBeTransferred() public {
        // Mint soulbound token
        vm.prank(admin);
        primary.adminMintTo(licenseId, legacyUser, "ipfs://legacy/1");

        ILicenseContract license = ILicenseContract(licenseAddr);

        // Approve secondary marketplace
        vm.prank(legacyUser);
        license.approve(address(secondary), 0);

        // Attempt transfer via secondary should fail
        vm.prank(address(secondary));
        vm.expectRevert(abi.encodeWithSelector(TokenLocked.selector, 0));
        license.transferFrom(legacyUser, buyer, 0);
    }

    function test_NormalToken_CanBeTransferred() public {
        // Mint normal token
        vm.prank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        vm.prank(buyer);
        primary.mintLicense(licenseId, buyer, "ipfs://normal/1");

        ILicenseContract license = ILicenseContract(licenseAddr);

        // Approve and transfer should succeed
        vm.prank(buyer);
        license.approve(address(secondary), 0);

        vm.prank(address(secondary));
        license.transferFrom(buyer, legacyUser, 0);

        assertEq(license.ownerOf(0), legacyUser);
    }

    /*//////////////////////////////////////////////////////////////
                    SECONDARY MARKETPLACE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CreateOffer_RevertsForSoulboundToken() public {
        // Mint soulbound token
        vm.prank(admin);
        primary.adminMintTo(licenseId, legacyUser, "ipfs://legacy/1");

        ILicenseContract license = ILicenseContract(licenseAddr);

        // Approve secondary marketplace
        vm.prank(legacyUser);
        license.approve(address(secondary), 0);

        // Attempt to create offer should fail
        vm.prank(legacyUser);
        vm.expectRevert(abi.encodeWithSelector(TokenIsSoulbound.selector, 0));
        secondary.createOffer(0, licenseAddr, 10e6);
    }

    function test_CreateOffer_SucceedsForNormalToken() public {
        // Mint normal token
        vm.prank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        vm.prank(buyer);
        primary.mintLicense(licenseId, buyer, "ipfs://normal/1");

        ILicenseContract license = ILicenseContract(licenseAddr);

        // Approve secondary marketplace
        vm.prank(buyer);
        license.approve(address(secondary), 0);

        // Create offer should succeed
        vm.prank(buyer);
        secondary.createOffer(0, licenseAddr, 10e6);

        // Verify offer was created
        (address seller,,,,, bool isActive) = secondary.offerById(0);
        assertEq(seller, buyer);
        assertTrue(isActive);
    }

    /*//////////////////////////////////////////////////////////////
                        ERC-5192 INTERFACE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SupportsInterface_ERC5192() public {
        ILicenseContract license = ILicenseContract(licenseAddr);
        
        // ERC-5192 interface ID: 0xb45a3c0e
        bytes4 erc5192InterfaceId = 0xb45a3c0e;
        
        // Use low-level call since supportsInterface isn't in ILicenseContract
        (bool success, bytes memory data) = licenseAddr.staticcall(
            abi.encodeWithSignature("supportsInterface(bytes4)", erc5192InterfaceId)
        );
        
        assertTrue(success, "supportsInterface call should succeed");
        bool supported = abi.decode(data, (bool));
        assertTrue(supported, "Should support ERC-5192 interface");
    }

    function test_SupportsInterface_ERC721() public {
        // ERC-721 interface ID: 0x80ac58cd
        bytes4 erc721InterfaceId = 0x80ac58cd;
        
        (bool success, bytes memory data) = licenseAddr.staticcall(
            abi.encodeWithSignature("supportsInterface(bytes4)", erc721InterfaceId)
        );
        
        assertTrue(success);
        assertTrue(abi.decode(data, (bool)), "Should support ERC-721 interface");
    }

    function test_Locked_ReturnsFalseForNonExistentToken() public {
        ILicenseContract license = ILicenseContract(licenseAddr);
        
        // Token 999 doesn't exist - should return false (default)
        assertFalse(license.locked(999));
    }

    /*//////////////////////////////////////////////////////////////
                        MIXED SCENARIO TESTS
    //////////////////////////////////////////////////////////////*/

    function test_MixedMints_OnlyLegacyAreLocked() public {
        ILicenseContract license = ILicenseContract(licenseAddr);
        
        // Mint normal token (ID 0)
        vm.prank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        vm.prank(buyer);
        primary.mintLicense(licenseId, buyer, "ipfs://normal/1");
        
        // Mint soulbound token (ID 1)
        vm.prank(admin);
        primary.adminMintTo(licenseId, legacyUser, "ipfs://legacy/1");
        
        // Mint another normal token (ID 2)
        vm.prank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        vm.prank(buyer);
        primary.mintLicense(licenseId, buyer, "ipfs://normal/2");

        // Verify lock status
        assertFalse(license.locked(0), "Token 0 (normal) should not be locked");
        assertTrue(license.locked(1), "Token 1 (legacy) should be locked");
        assertFalse(license.locked(2), "Token 2 (normal) should not be locked");
    }
}
