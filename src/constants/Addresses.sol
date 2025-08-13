// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Addresses {
    address public constant BURNINGADDRESS =
        0x000000000000000000000000000000000000dEaD;
    address public immutable ADMINISTRATOR;

    constructor() {
        ADMINISTRATOR = 0xC6Fe5D33615a1C52c08018c47E8Bc53646A0E101;
    }
}
