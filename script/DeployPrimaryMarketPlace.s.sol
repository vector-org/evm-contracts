// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PrimaryMarketPlace} from "../src/PrimaryMarketPlace.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployPrimaryMarketPlaceProxy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address admin = vm.addr(deployerPrivateKey);
        address factoryProxy = vm.envAddress("FACTORY_PROXY_ADDRESS");

        PrimaryMarketPlace primaryImpl = new PrimaryMarketPlace();

        ERC1967Proxy primaryProxy = new ERC1967Proxy(
            address(primaryImpl),
            abi.encodeWithSelector(
                PrimaryMarketPlace.initialize.selector,
                admin,
                admin,
                factoryProxy
            )
        );

        console.log("PrimaryMarketPlace Implementation:", address(primaryImpl));
        console.log("PrimaryMarketPlace Proxy:", address(primaryProxy));

        vm.stopBroadcast();
    }
}

contract DeployPrimaryMarketPlace is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address primaryProxy = vm.envAddress("PRIMARY_PROXY_ADDRESS");
        PrimaryMarketPlace primaryImpl = new PrimaryMarketPlace();

        PrimaryMarketPlace(primaryProxy).upgradeToAndCall(
            address(primaryImpl),
            ""
        );

        console.log("PrimaryMarketPlace upgraded to:", address(primaryImpl));

        vm.stopBroadcast();
    }
}
