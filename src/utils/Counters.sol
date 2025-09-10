// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {decrementOverflow} from "../errors/Counters.sol";

/**
 * @author Vector Blockchain AG
 * @title Counters
 * @notice Library for managing counters that can be incremented, decremented, reset, or set to a value.
 * @dev Used for tracking counts such as token IDs in contracts.
 */
library Counters {
    struct Counter {
        uint256 _value;
    }

    /// @notice Returns the current value of the counter.
    /// @param counter The counter to read.
    /// @return The current value of the counter.
    function current(Counter storage counter) internal view returns (uint256) {
        return counter._value;
    }

    /// @notice Increments the counter by 1.
    /// @param counter The counter to increment.
    function increment(Counter storage counter) internal {
        unchecked {
            ++counter._value;
        }
    }

    /// @notice Decrements the counter by 1. Reverts if already zero.
    /// @param counter The counter to decrement.
    function decrement(Counter storage counter) internal {
        uint256 value = counter._value;
        if (value == 0) {
            revert decrementOverflow(value);
        }
        unchecked {
            --counter._value;
        }
    }

    /// @notice Resets the counter to zero.
    /// @param counter The counter to reset.
    function reset(Counter storage counter) internal {
        counter._value = 0;
    }

    /// @notice Sets the counter to a specific value.
    /// @param counter The counter to set.
    /// @param newValue The new value to assign to the counter.
    function setTo(Counter storage counter, uint256 newValue) internal {
        counter._value = newValue;
    }
}
