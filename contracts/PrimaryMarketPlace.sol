// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LicenseFactory.sol";
import "@openzeppelin/contracts/utils/Counters.sol"; 

contract PrimaryMarketPlace{
    address private immutable primary_marketplace = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address private immutable secondary_marketplace = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address private immutable administrator = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address private coordinator = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
}