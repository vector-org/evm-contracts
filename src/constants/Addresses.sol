// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Addresses {
    address public constant BURNINGADDRESS =
        0x000000000000000000000000000000000000dEaD;
    address public immutable ADMINISTRATOR;

    constructor() {
        ADMINISTRATOR = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    }
}
