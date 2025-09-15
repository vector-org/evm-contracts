// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {LicenseFactory} from "src/LicenseFactory.sol";
import {PrimaryMarketPlace} from "src/PrimaryMarketPlace.sol";
import {SecondaryMarketPlace} from "src/SecondaryMarketPlace.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {LicenseInput} from "src/types/Types.sol";

contract BaseSetup is Test {
    LicenseFactory internal factory;
    PrimaryMarketPlace internal primary;
    SecondaryMarketPlace internal secondary;

    address internal admin;
    address internal coordinator;
    address internal developer;
    address internal publisher;
    address internal platform;
    address internal buyer;

    uint256 internal constant TOTAL_FEE = 0.8 ether;
    uint256 internal constant PUB_FEE = (TOTAL_FEE * 5) / 100;
    uint256 internal constant PLATFORM_FEE = (TOTAL_FEE * 5) / 100;
    uint256 internal constant DEV_FEE = TOTAL_FEE - PUB_FEE - PLATFORM_FEE;

    function setUp() public virtual {
        admin = address(this);
        coordinator = makeAddr("coordinator");
        developer = makeAddr("developer");
        publisher = makeAddr("publisher");
        platform = makeAddr("platform");
        buyer = makeAddr("buyer");

        vm.deal(coordinator, 100 ether);
        vm.deal(developer, 2 ether);
        vm.deal(publisher, 2 ether);
        vm.deal(platform, 2 ether);
        vm.deal(buyer, 100 ether);

        LicenseFactory factoryImpl = new LicenseFactory();
        PrimaryMarketPlace primaryImpl = new PrimaryMarketPlace();
        SecondaryMarketPlace secondaryImpl = new SecondaryMarketPlace();

        ERC1967Proxy factoryProxy = new ERC1967Proxy(
            address(factoryImpl),
            abi.encodeWithSelector(LicenseFactory.initialize.selector, admin)
        );

        ERC1967Proxy primaryProxy = new ERC1967Proxy(
            address(primaryImpl),
            abi.encodeWithSelector(
                PrimaryMarketPlace.initialize.selector,
                admin,
                coordinator,
                address(factoryProxy)
            )
        );

        ERC1967Proxy secondaryProxy = new ERC1967Proxy(
            address(secondaryImpl),
            abi.encodeWithSelector(
                SecondaryMarketPlace.initialize.selector,
                admin,
                coordinator,
                address(factoryProxy),
                address(primaryProxy)
            )
        );

        factory = LicenseFactory(address(factoryProxy));
        primary = PrimaryMarketPlace(address(primaryProxy));
        secondary = SecondaryMarketPlace(address(secondaryProxy));

        vm.prank(admin);
        factory.setCoordinator(coordinator, true);

        vm.prank(admin);
        primary.setSecondaryMarketPlace(address(secondary));
    }

    function _createLicense(
        bool active
    ) internal returns (address licenseAddr, uint256 licenseId) {
        LicenseInput memory input = LicenseInput({
            name: "TestLicense",
            symbol: "TL",
            uri: "ipfs://root/0",
            isActive: active,
            totalFee: TOTAL_FEE,
            developer: developer,
            publisher: publisher,
            platform: platform,
            primaryMarketplace: address(primary),
            secondaryMarketplace: address(secondary)
        });

        vm.prank(coordinator);
        licenseAddr = factory.createLicense(input);
        uint256[] memory ids = factory.getAllLicenseIds();
        licenseId = ids[ids.length - 1];
    }
}
