// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {LicenseFactory} from "src/LicenseFactory.sol";
import {PrimaryMarketPlace} from "src/PrimaryMarketPlace.sol";
import {SecondaryMarketPlace} from "src/SecondaryMarketPlace.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {LicenseContract} from "src/LicenseContract.sol";
import {LicenseInput} from "src/types/Types.sol";

contract BaseSetup is Test {
    LicenseFactory internal factory;
    PrimaryMarketPlace internal primary;
    SecondaryMarketPlace internal secondary;

    address internal admin; // also deployer
    address internal coordinator;
    address internal developer;
    address internal publisher;
    address internal platform;
    address internal buyer;

    uint256 internal constant DEV_FEE = 0.01 ether;
    uint256 internal constant PUB_FEE = 0.02 ether;
    uint256 internal constant PLATFORM_FEE = 0.03 ether;

    function setUp() public virtual {
        admin = address(this); // test contract acts as admin
        coordinator = makeAddr("coordinator");
        developer = makeAddr("developer");
        publisher = makeAddr("publisher");
        platform = makeAddr("platform");
        buyer = makeAddr("buyer");

        // fund participants
        vm.deal(coordinator, 100 ether);
        vm.deal(developer, 1 ether);
        vm.deal(publisher, 1 ether);
        vm.deal(platform, 1 ether);
        vm.deal(buyer, 100 ether);

        // Deploy implementations
        LicenseFactory factoryImpl = new LicenseFactory();
        PrimaryMarketPlace primaryImpl = new PrimaryMarketPlace();
        SecondaryMarketPlace secondaryImpl = new SecondaryMarketPlace();

        // Deploy proxies with initialization data
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

        // Cast proxies to contract types
        factory = LicenseFactory(address(factoryProxy));
        primary = PrimaryMarketPlace(address(primaryProxy));
        secondary = SecondaryMarketPlace(address(secondaryProxy));

        // grant coordinator rights in factory
        vm.prank(admin);
        factory.setCoordinator(coordinator, true);

        // register secondary marketplace in primary so it can perform ownership updates
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
            developerFee: DEV_FEE,
            platformFee: PLATFORM_FEE,
            publisherFee: PUB_FEE,
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
