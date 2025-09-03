// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {UnsafeUpgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {LicenseFactory} from "../src/LicenseFactory.sol";
import {PrimaryMarketPlace} from "../src/PrimaryMarketPlace.sol";
import {SecondaryMarketPlace} from "../src/SecondaryMarketPlace.sol";
import {LicenseInput} from "../src/types/Types.sol";

contract UpgradeTest is Test {
    LicenseFactory licenseFactory;
    PrimaryMarketPlace primaryMarketPlace;
    SecondaryMarketPlace secondaryMarketPlace;
    
    address licenseFactoryProxy;
    address primaryMarketPlaceProxy;
    address secondaryMarketPlaceProxy;
    
    address admin = 0x1234567890123456789012345678901234567890;
    address coordinator = 0xaBcDef1234567890123456789012345678901234;
    address user1 = 0x7890123456789012345678901234567890123456;
    address user2 = 0xdeaDbEef12345678901234567890123456789012;
    
    function setUp() public {
        // Start prank with admin to ensure proper deployment
        vm.startPrank(admin);
        
        // Deploy LicenseFactory via proxy
        address licenseFactoryImpl = address(new LicenseFactory());
        licenseFactoryProxy = UnsafeUpgrades.deployUUPSProxy(
            licenseFactoryImpl,
            abi.encodeCall(LicenseFactory.initialize, (admin))
        );
        
        // Deploy PrimaryMarketPlace via proxy  
        address primaryMarketPlaceImpl = address(new PrimaryMarketPlace());
        primaryMarketPlaceProxy = UnsafeUpgrades.deployUUPSProxy(
            primaryMarketPlaceImpl,
            abi.encodeCall(PrimaryMarketPlace.initialize, (admin, coordinator, licenseFactoryProxy))
        );
        
        // Deploy SecondaryMarketPlace via proxy
        address secondaryMarketPlaceImpl = address(new SecondaryMarketPlace());
        secondaryMarketPlaceProxy = UnsafeUpgrades.deployUUPSProxy(
            secondaryMarketPlaceImpl,
            abi.encodeCall(SecondaryMarketPlace.initialize, (admin, coordinator, licenseFactoryProxy, primaryMarketPlaceProxy))
        );
        
        licenseFactory = LicenseFactory(licenseFactoryProxy);
        primaryMarketPlace = PrimaryMarketPlace(primaryMarketPlaceProxy);
        secondaryMarketPlace = SecondaryMarketPlace(secondaryMarketPlaceProxy);
        
        vm.stopPrank();
    }
    
    function test_InitialDeployment() public view {
        assertEq(licenseFactory.owner(), admin);
        assertEq(primaryMarketPlace.owner(), admin);
        assertEq(secondaryMarketPlace.owner(), admin);
    }
    
    function test_UpgradeLicenseFactory() public {
        // Create some state before upgrade
        vm.startPrank(admin);
        
        LicenseInput memory licenseInput = LicenseInput({
            name: "Test License",
            symbol: "TL",
            uri: "https://test.com",
            isActive: true,
            developerFee: 100,
            platformFee: 50,
            publisherFee: 25,
            developer: user1,
            publisher: user2,
            platform: admin,
            primaryMarketplace: primaryMarketPlaceProxy,
            secondaryMarketplace: secondaryMarketPlaceProxy
        });
        
        licenseFactory.createLicense(licenseInput);
        uint256[] memory licenseIds = licenseFactory.getAllLicenseIds();
        assertEq(licenseIds.length, 1);
        
        // Deploy new implementation
        address newImplementation = address(new LicenseFactory());
        
        // Upgrade the contract
        UnsafeUpgrades.upgradeProxy(licenseFactoryProxy, newImplementation, "");
        
        // Verify state is preserved after upgrade
        uint256[] memory licenseIdsAfterUpgrade = licenseFactory.getAllLicenseIds();
        assertEq(licenseIdsAfterUpgrade.length, 1);
        assertEq(licenseIdsAfterUpgrade[0], licenseIds[0]);
        
        // Verify functionality still works
        licenseFactory.createLicense(licenseInput);
        uint256[] memory finalLicenseIds = licenseFactory.getAllLicenseIds();
        assertEq(finalLicenseIds.length, 2);
        
        vm.stopPrank();
    }
    
    function test_UpgradePrimaryMarketPlace() public {
        vm.startPrank(admin);
        
        // Create initial state
        LicenseInput memory licenseInput = LicenseInput({
            name: "Test License",
            symbol: "TL",
            uri: "https://test.com",
            isActive: true,
            developerFee: 100,
            platformFee: 50,
            publisherFee: 25,
            developer: user1,
            publisher: user2,
            platform: admin,
            primaryMarketplace: primaryMarketPlaceProxy,
            secondaryMarketplace: secondaryMarketPlaceProxy
        });
        
        licenseFactory.createLicense(licenseInput);
        
        // Upgrade PrimaryMarketPlace
        address newPrimaryImpl = address(new PrimaryMarketPlace());
        UnsafeUpgrades.upgradeProxy(primaryMarketPlaceProxy, newPrimaryImpl, "");
        
        // Verify functionality after upgrade
        assertEq(primaryMarketPlace.owner(), admin);
        
        vm.stopPrank();
    }
    
    function test_UpgradeSecondaryMarketPlace() public {
        vm.startPrank(admin);
        
        // Upgrade SecondaryMarketPlace
        address newSecondaryImpl = address(new SecondaryMarketPlace());
        UnsafeUpgrades.upgradeProxy(secondaryMarketPlaceProxy, newSecondaryImpl, "");
        
        // Verify functionality after upgrade
        assertEq(secondaryMarketPlace.owner(), admin);
        
        vm.stopPrank();
    }
    
    function test_UnauthorizedUpgrade() public {
        vm.startPrank(user1);
        
        // Should revert when non-owner tries to upgrade
        address newImpl = address(new LicenseFactory());
        
        // Try to call upgradeTo directly and expect it to fail
        (bool success,) = licenseFactoryProxy.call(
            abi.encodeWithSignature("upgradeTo(address)", newImpl)
        );
        assertFalse(success, "Unauthorized upgrade should fail");
        
        vm.stopPrank();
    }
    
    function test_UpgradeStatePreservation() public {
        vm.startPrank(admin);
        
        // Create multiple licenses before upgrade
        LicenseInput memory licenseInput1 = LicenseInput({
            name: "License 1",
            symbol: "L1",
            uri: "https://license1.com",
            isActive: true,
            developerFee: 100,
            platformFee: 50,
            publisherFee: 25,
            developer: user1,
            publisher: user2,
            platform: admin,
            primaryMarketplace: primaryMarketPlaceProxy,
            secondaryMarketplace: secondaryMarketPlaceProxy
        });
        
        LicenseInput memory licenseInput2 = LicenseInput({
            name: "License 2",
            symbol: "L2",
            uri: "https://license2.com",
            isActive: true,
            developerFee: 200,
            platformFee: 100,
            publisherFee: 50,
            developer: user2,
            publisher: user1,
            platform: admin,
            primaryMarketplace: primaryMarketPlaceProxy,
            secondaryMarketplace: secondaryMarketPlaceProxy
        });
        
        licenseFactory.createLicense(licenseInput1);
        licenseFactory.createLicense(licenseInput2);
        
        uint256[] memory preUpgradeLicenseIds = licenseFactory.getAllLicenseIds();
        assertEq(preUpgradeLicenseIds.length, 2);
        
        // Upgrade the contract
        address newImplementation = address(new LicenseFactory());
        UnsafeUpgrades.upgradeProxy(licenseFactoryProxy, newImplementation, "");
        
        // Verify all state is preserved
        uint256[] memory postUpgradeLicenseIds = licenseFactory.getAllLicenseIds();
        assertEq(postUpgradeLicenseIds.length, 2);
        assertEq(postUpgradeLicenseIds[0], preUpgradeLicenseIds[0]);
        assertEq(postUpgradeLicenseIds[1], preUpgradeLicenseIds[1]);
        
        vm.stopPrank();
    }
}
