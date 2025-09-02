// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrantCall} from "../errors/Common.sol";

abstract contract ReentrancyGuard {
    bool private _locked;

    modifier nonReentrant() {
        if (_locked) revert ReentrantCall();
        _locked = true;
        _;
        _locked = false;
    }
}
