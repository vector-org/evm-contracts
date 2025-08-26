// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Addresses {
    address public constant BURNINGADDRESS = address(0);
    address public immutable ADMINISTRATOR;
    string public constant version = "0.1.0";

    constructor(address _admin) {
        ADMINISTRATOR = _admin;
    }
}
