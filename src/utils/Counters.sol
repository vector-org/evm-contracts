// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {decrementOverflow} from "../errors/Counters.sol";

library Counters {
    struct Counter {
        uint256 _value;
    }

    function current(Counter storage counter) internal view returns (uint256) {
        return counter._value;
    }

    function increment(Counter storage counter) internal {
        unchecked {
            counter._value += 1;
        }
    }

    function decrement(Counter storage counter) internal {
        uint256 value = counter._value;
        if (value <= 0) {
            revert decrementOverflow(value);
        }
        unchecked {
            counter._value = value - 1;
        }
    }

    function reset(Counter storage counter) internal {
        counter._value = 0;
    }

    function setTo(Counter storage counter, uint256 newValue) internal {
        counter._value = newValue;
    }
}
