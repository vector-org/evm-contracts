// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Addresses {
    address public constant BURNINGADDRESS =
        0x000000000000000000000000000000000000dEaD;
    address public immutable PRIMARYMARKETPLACE;
    address public immutable SECONDARYMARKETPLACE;
    address public immutable ADMINISTRATOR;

    constructor() {
        PRIMARYMARKETPLACE = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
        SECONDARYMARKETPLACE = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
        ADMINISTRATOR = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    }
}
