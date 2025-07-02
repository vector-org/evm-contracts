// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ILicenseContract
/// @notice Interface for interacting with the LicenseContract which represents ERC721 licenses with controlled minting and transfer logic.
interface ILicenseContract {
    /// @notice Mints a new license NFT with a specific token URI to a recipient address.
    /// @param uri The token URI pointing to the metadata (e.g., IPFS link).
    /// @param to The address that will receive the newly minted license token.
    /// @param licenseId The unique token ID for this license.
    function safeMint(string memory uri, address to, uint256 licenseId) external;

    /// @notice Returns the metadata URI of a specific license token.
    /// @param licenseId The ID of the license token.
    /// @return A string containing the token URI.
    function tokenURI(uint256 licenseId) external view returns (string memory);

    /// @notice Returns the designated owner of the LicenseContract.
    /// @return The address of the contract deployer or admin.
    function owner() external view returns (address);
}
