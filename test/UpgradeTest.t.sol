// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {UnsafeUpgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {LicenseFactory} from "../src/LicenseFactory.sol";
import {PrimaryMarketPlace} from "../src/PrimaryMarketPlace.sol";
import {SecondaryMarketPlace} from "../src/SecondaryMarketPlace.sol";
import {LicenseInput} from "../src/types/Types.sol";

contract UpgradeTest is Test {
    LicenseFactory public licenseFactory;
    PrimaryMarketPlace public primaryMarketPlace;
    SecondaryMarketPlace public secondaryMarketPlace;

    address public licenseFactoryProxy;
    address payable public primaryMarketPlaceProxy;
    address public secondaryMarketPlaceProxy;

    address public admin = makeAddr("admin");
    address public coordinator = makeAddr("coordinator");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");

    function setUp() public {
        vm.startPrank(admin);

        address licenseFactoryImpl = address(new LicenseFactory());
        licenseFactoryProxy = UnsafeUpgrades.deployUUPSProxy(
            licenseFactoryImpl,
            abi.encodeCall(LicenseFactory.initialize, (admin))
        );

        address primaryMarketPlaceImpl = address(new PrimaryMarketPlace());
        primaryMarketPlaceProxy = payable(
            UnsafeUpgrades.deployUUPSProxy(
                primaryMarketPlaceImpl,
                abi.encodeCall(
                    PrimaryMarketPlace.initialize,
                    (admin, coordinator, licenseFactoryProxy)
                )
            )
        );

        address secondaryMarketPlaceImpl = address(new SecondaryMarketPlace());
        secondaryMarketPlaceProxy = UnsafeUpgrades.deployUUPSProxy(
            secondaryMarketPlaceImpl,
            abi.encodeCall(
                SecondaryMarketPlace.initialize,
                (
                    admin,
                    coordinator,
                    licenseFactoryProxy,
                    primaryMarketPlaceProxy
                )
            )
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
        vm.startPrank(admin);

        LicenseInput memory licenseInput = LicenseInput({
            name: "Test License",
            symbol: "TL",
            uri: "https://test.com",
            isActive: true,
            totalFee: 175,
            developer: user1,
            publisher: user2,
            platform: admin,
            primaryMarketplace: primaryMarketPlaceProxy,
            secondaryMarketplace: secondaryMarketPlaceProxy
        });

        licenseFactory.createLicense(licenseInput);
        uint256[] memory licenseIds = licenseFactory.getAllLicenseIds();
        assertEq(licenseIds.length, 1);

        address newImplementation = address(new LicenseFactory());

        UnsafeUpgrades.upgradeProxy(licenseFactoryProxy, newImplementation, "");

        uint256[] memory licenseIdsAfterUpgrade = licenseFactory
            .getAllLicenseIds();
        assertEq(licenseIdsAfterUpgrade.length, 1);
        assertEq(licenseIdsAfterUpgrade[0], licenseIds[0]);

        licenseFactory.createLicense(licenseInput);
        uint256[] memory finalLicenseIds = licenseFactory.getAllLicenseIds();
        assertEq(finalLicenseIds.length, 2);

        vm.stopPrank();
    }

    function test_UpgradePrimaryMarketPlace() public {
        vm.startPrank(admin);

        LicenseInput memory licenseInput = LicenseInput({
            name: "Test License",
            symbol: "TL",
            uri: "https://test.com",
            isActive: true,
            totalFee: 175,
            developer: user1,
            publisher: user2,
            platform: admin,
            primaryMarketplace: primaryMarketPlaceProxy,
            secondaryMarketplace: secondaryMarketPlaceProxy
        });

        licenseFactory.createLicense(licenseInput);

        address newPrimaryImpl = address(new PrimaryMarketPlace());
        UnsafeUpgrades.upgradeProxy(
            primaryMarketPlaceProxy,
            newPrimaryImpl,
            ""
        );

        assertEq(primaryMarketPlace.owner(), admin);

        vm.stopPrank();
    }

    function test_UpgradeSecondaryMarketPlace() public {
        vm.startPrank(admin);

        address newSecondaryImpl = address(new SecondaryMarketPlace());
        UnsafeUpgrades.upgradeProxy(
            secondaryMarketPlaceProxy,
            newSecondaryImpl,
            ""
        );

        assertEq(secondaryMarketPlace.owner(), admin);

        vm.stopPrank();
    }

    function test_UnauthorizedUpgrade() public {
        vm.startPrank(user1);

        address newImpl = address(new LicenseFactory());

        (bool success, ) = licenseFactoryProxy.call(
            abi.encodeWithSignature("upgradeTo(address)", newImpl)
        );
        assertFalse(success);

        vm.stopPrank();
    }

    function test_UpgradeStatePreservation() public {
        vm.startPrank(admin);

        LicenseInput memory licenseInput1 = LicenseInput({
            name: "License 1",
            symbol: "L1",
            uri: "https://license1.com",
            isActive: true,
            totalFee: 175,
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
            totalFee: 175,
            developer: user2,
            publisher: user1,
            platform: admin,
            primaryMarketplace: primaryMarketPlaceProxy,
            secondaryMarketplace: secondaryMarketPlaceProxy
        });

        licenseFactory.createLicense(licenseInput1);
        licenseFactory.createLicense(licenseInput2);

        uint256[] memory preUpgradeLicenseIds = licenseFactory
            .getAllLicenseIds();
        assertEq(preUpgradeLicenseIds.length, 2);

        address newImplementation = address(new LicenseFactory());
        UnsafeUpgrades.upgradeProxy(licenseFactoryProxy, newImplementation, "");

        uint256[] memory postUpgradeLicenseIds = licenseFactory
            .getAllLicenseIds();
        assertEq(postUpgradeLicenseIds.length, 2);
        assertEq(postUpgradeLicenseIds[0], preUpgradeLicenseIds[0]);
        assertEq(postUpgradeLicenseIds[1], preUpgradeLicenseIds[1]);

        vm.stopPrank();
    }
}
