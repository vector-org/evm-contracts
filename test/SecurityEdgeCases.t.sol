// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BaseSetup} from "./BaseSetup.t.sol";
import {ILicenseContract} from "src/interfaces/ILicenseContract.sol";
import {TokenLocked} from "src/errors/LicenseContract.sol";
import {TokenIsSoulbound} from "src/errors/SecondaryMarketPlace.sol";
import {UnAuthorizedUser, onlyAdmin} from "src/errors/Common.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SecurityEdgeCasesTest
 * @notice Advanced security tests and edge cases for the system
 */
contract SecurityEdgeCasesTest is BaseSetup {
    address internal licenseAddr;
    uint256 internal licenseId;
    address internal legacyUser;
    address internal attacker;

    function setUp() public override {
        super.setUp();
        (licenseAddr, licenseId) = _createLicense(true);
        legacyUser = makeAddr("legacyUser");
        attacker = makeAddr("attacker");
        
        // Set mint authority to admin for testing
        vm.prank(admin);
        primary.setMintAuthority(admin);
    }

    /*//////////////////////////////////////////////////////////////
                        SOULBOUND BYPASS ATTEMPTS
    //////////////////////////////////////////////////////////////*/

    function test_Soulbound_TransferFrom_Bypass_Attempt() public {
        // Mint soulbound token
        vm.prank(admin);
        primary.adminMintTo(licenseId, legacyUser, "ipfs://legacy/1");

        ILicenseContract license = ILicenseContract(licenseAddr);

        // Approve attacker
        vm.prank(legacyUser);
        license.approve(attacker, 0);

        // Attacker tries transferFrom (not safeTransferFrom)
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(TokenLocked.selector, 0));
        license.transferFrom(legacyUser, attacker, 0);
    }

    function test_Soulbound_Operator_Bypass_Attempt() public {
        // Mint soulbound token
        vm.prank(admin);
        primary.adminMintTo(licenseId, legacyUser, "ipfs://legacy/1");

        ILicenseContract license = ILicenseContract(licenseAddr);

        // Set attacker as operator
        vm.prank(legacyUser);
        license.setApprovalForAll(attacker, true);

        // Attacker tries transferFrom
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(TokenLocked.selector, 0));
        license.transferFrom(legacyUser, attacker, 0);
    }

    /*//////////////////////////////////////////////////////////////
                    SECONDARY MARKETPLACE EDGE CASES
    //////////////////////////////////////////////////////////////*/

    function test_Secondary_Buy_With_Insufficient_Allowance() public {
        // Mint normal token
        vm.prank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        vm.prank(buyer);
        primary.mintLicense(licenseId, buyer, "ipfs://normal/1");

        ILicenseContract license = ILicenseContract(licenseAddr);
        uint256 tokenId = 0;

        // List token
        vm.prank(buyer);
        license.approve(address(secondary), tokenId);
        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 10e6);

        // Attacker has funds but no allowance
        usdc.mint(attacker, 100e6);
        
        vm.prank(attacker);
        vm.expectRevert(); // ERC20InsufficientAllowance
        secondary.acceptOffer(tokenId);
    }

    function test_Secondary_Buy_With_Insufficient_Balance() public {
        // Mint normal token
        vm.prank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        vm.prank(buyer);
        primary.mintLicense(licenseId, buyer, "ipfs://normal/1");

        ILicenseContract license = ILicenseContract(licenseAddr);
        uint256 tokenId = 0;

        // List token
        vm.prank(buyer);
        license.approve(address(secondary), tokenId);
        vm.prank(buyer);
        secondary.createOffer(tokenId, licenseAddr, 10e6);

        // Attacker has allowance but no funds
        vm.prank(attacker);
        usdc.approve(address(secondary), 100e6);
        
        vm.prank(attacker);
        vm.expectRevert(); // ERC20InsufficientBalance
        secondary.acceptOffer(tokenId);
    }

    /*//////////////////////////////////////////////////////////////
                        ACCESS CONTROL & PAUSABILITY
    //////////////////////////////////////////////////////////////*/

    function test_AdminMint_Unauthorized() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(UnAuthorizedUser.selector, attacker));
        primary.adminMintTo(licenseId, attacker, "ipfs://hack");
    }

    function test_SetMintAuthority_Unauthorized() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(UnAuthorizedUser.selector, attacker));
        primary.setMintAuthority(attacker);
    }

    function test_Pause_Blocks_Minting() public {
        vm.prank(admin);
        primary.pause();

        vm.prank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        primary.mintLicense(licenseId, buyer, "ipfs://paused");
    }

    function test_Pause_Blocks_AdminMint() public {
        vm.prank(admin);
        primary.pause();

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        primary.adminMintTo(licenseId, legacyUser, "ipfs://paused");
    }

    function test_Pause_Blocks_Secondary_Create() public {
        // Mint before pause
        vm.prank(buyer);
        usdc.approve(address(primary), TOTAL_FEE);
        vm.prank(buyer);
        primary.mintLicense(licenseId, buyer, "ipfs://normal/1");
        
        vm.prank(admin);
        secondary.pause(); // Pause secondary

        ILicenseContract license = ILicenseContract(licenseAddr);
        vm.prank(buyer);
        license.approve(address(secondary), 0);

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        secondary.createOffer(0, licenseAddr, 10e6);
    }
}
