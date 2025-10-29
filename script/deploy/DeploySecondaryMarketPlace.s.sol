// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {SecondaryMarketPlace} from "../../src/SecondaryMarketPlace.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeploySecondaryMarketPlaceProxy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address admin = vm.addr(deployerPrivateKey);
        address factoryProxy = vm.envAddress("FACTORY_PROXY_ADDRESS");
        address primaryProxy = vm.envAddress("PRIMARY_PROXY_ADDRESS");

        SecondaryMarketPlace secondaryImpl = new SecondaryMarketPlace();

        ERC1967Proxy secondaryProxy = new ERC1967Proxy(
            address(secondaryImpl),
            abi.encodeWithSelector(
                SecondaryMarketPlace.initialize.selector,
                admin,
                admin,
                factoryProxy,
                primaryProxy
            )
        );

        console.log(
            "SecondaryMarketPlace Implementation:",
            address(secondaryImpl)
        );
        console.log("SecondaryMarketPlace Proxy:", address(secondaryProxy));

        vm.stopBroadcast();
    }
}

contract DeploySecondaryMarketPlace is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address secondaryProxy = vm.envAddress("SECONDARY_PROXY_ADDRESS");
        SecondaryMarketPlace secondaryImpl = new SecondaryMarketPlace();

        SecondaryMarketPlace(secondaryProxy).upgradeToAndCall(
            address(secondaryImpl),
            ""
        );

        console.log(
            "SecondaryMarketPlace upgraded to:",
            address(secondaryImpl)
        );

        vm.stopBroadcast();
    }
}
