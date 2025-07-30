// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {LicenseFactory} from "../src/LicenseFactory.sol";

contract LicenseFactoryTest is Test {
    LicenseFactory public licenseFactory;

    function setUp() public {
        licenseFactory = new LicenseFactory();
    }

    function test_LicenseFactoryDeployment() public {
        assertTrue(address(licenseFactory) != address(0));
    }
}