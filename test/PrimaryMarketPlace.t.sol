// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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
        uint256 total = TOTAL_FEE;

        uint256 devBefore = usdc.balanceOf(developer);
        uint256 platBefore = usdc.balanceOf(platform);

        vm.startPrank(buyer);
        usdc.approve(address(primary), total);
        primary.mintLicense(licenseId, buyer, "ipfs://nft/0");
        vm.stopPrank();

        assertEq(usdc.balanceOf(developer), devBefore + DEV_FEE);
        assertEq(usdc.balanceOf(platform), platBefore + PLATFORM_FEE);

        assertEq(ILicenseContract(licenseAddr).ownerOf(0), buyer);
    }

    function testMintInactiveReverts() public {
        (, uint256 licenseId) = _createLicense(false);
        uint256 total = TOTAL_FEE;
        vm.startPrank(buyer);
        usdc.approve(address(primary), total);
        vm.expectRevert(
            abi.encodeWithSelector(licenseNotActive.selector, licenseId)
        );
        primary.mintLicense(licenseId, buyer, "ipfs://nft/0");
        vm.stopPrank();
    }

    function testMintWrongValueReverts() public {
        (, uint256 licenseId) = _createLicense(true);
        vm.startPrank(buyer);
        usdc.approve(address(primary), 1); // Approve insufficient amount
        vm.expectRevert();
        primary.mintLicense(licenseId, buyer, "ipfs://nft/0");
        vm.stopPrank();
    }

    function testMintZeroPriceLicense() public {
        LicenseInput memory input = LicenseInput({
            name: "FreeLicense",
            symbol: "FREE",
            uri: "ipfs://root/free",
            isActive: true,
            totalFee: 0,
            developer: developer,
            platform: platform,
            primaryMarketplace: address(primary),
            secondaryMarketplace: address(secondary)
        });

        vm.prank(coordinator);
        address licenseAddr = factory.createLicense(input);
        uint256[] memory ids = factory.getAllLicenseIds();
        uint256 licenseId = ids[ids.length - 1];

        uint256 devBefore = usdc.balanceOf(developer);
        uint256 platBefore = usdc.balanceOf(platform);

        vm.startPrank(buyer);
        usdc.approve(address(primary), 0); // No approval needed for free
        primary.mintLicense(licenseId, buyer, "ipfs://nft/free0");
        vm.stopPrank();

        assertEq(usdc.balanceOf(developer), devBefore);
        assertEq(usdc.balanceOf(platform), platBefore);
        assertEq(ILicenseContract(licenseAddr).ownerOf(0), buyer);
    }

    function testMintWithoutApprovalReverts() public {
        (, uint256 licenseId) = _createLicense(true);
        
        // Try to mint without USDC approval - should revert
        vm.prank(buyer);
        vm.expectRevert();
        primary.mintLicense(licenseId, buyer, "ipfs://nft/no-approval");
    }
}
