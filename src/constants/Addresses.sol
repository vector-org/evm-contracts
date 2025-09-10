// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @author DJ (PlayOnVector)
 * @title Addresses
 * @notice Provides global addresses and versioning for the protocol.
 * @dev Holds the administrator address and zero address constant for use across contracts.
 */
contract Addresses {
    /// @notice The zero address constant (address(0)).
    address public constant ZERO_ADDRESS = address(0);
    /// @notice The administrator address for protocol control.
    address public immutable ADMINISTRATOR;
    /// @notice The version string for the protocol.
    string public constant VERSION = "0.1.0";

    /**
     * @notice Constructs the Addresses contract.
     * @param _admin The administrator address.
     */
    constructor(address _admin) {
        ADMINISTRATOR = _admin;
    }
}
