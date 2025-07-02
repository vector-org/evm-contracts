// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ILicenseContract
/// @notice Interface for interacting with the LicenseContract which mints restricted ERC-721 licenses.
interface ILicenseContract {
    /// @notice Mints a new license NFT.
    /// @dev Only callable by authorized contracts/users depending on your access controls.
    /// @param uri The metadata URI associated with the license.
    /// @param to The address to which the NFT will be minted.
    /// @param licenseId The token ID for the new license.
    function safeMint(string memory uri, address to, uint256 licenseId) external;

    /// @notice Returns the metadata URI of a given license token ID.
    /// @param licenseId The ID of the license token.
    /// @return A string representing the metadata URI.
    function tokenURI(uint256 licenseId) external view returns (string memory);

    /// @notice The address considered as the burn address.
    /// @return The `0x...dEaD` burn address.
    function burning_address() external view returns (address);

    /// @notice The immutable address of the primary marketplace.
    /// @return The address of the primary marketplace.
    function primary_marketplace() external view returns (address);

    /// @notice The immutable address of the secondary marketplace.
    /// @return The address of the secondary marketplace.
    function secondary_marketplace() external view returns (address);

    /// @notice The administrator address.
    /// @return The address of the administrator.
    function administrator() external view returns (address);

    /// @notice The owner/deployer of the LicenseContract.
    /// @return The address of the contract owner.
    function owner() external view returns (address);
}
