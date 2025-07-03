// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ILicenseContract
/// @notice Interface for interacting with the LicenseContract ERC-721 implementation with restricted minting and transfer rules.
interface ILicenseContract {
    /// @notice Mints a new license NFT to a specified address.
    /// @dev Only callable by authorized marketplaces.
    /// @param uri The metadata URI associated with the license.
    /// @param to The recipient address of the license.
    /// @param licenseId The token ID for the license.
    function safeMint(string memory uri, address to, uint256 licenseId) external;

    /// @notice Updates the token URI of an existing license NFT.
    /// @dev Only callable by the contract owner, administrator, or factory.
    /// @param licenseId The ID of the license token.
    /// @param newUri The new metadata URI.
    function updateTokenURI(uint256 licenseId, string memory newUri) external;

    /// @notice Returns the current token URI for a license.
    /// @param licenseId The ID of the license token.
    /// @return A string containing the metadata URI.
    function tokenURI(uint256 licenseId) external view returns (string memory);

    /// @notice Returns the burn address used to destroy tokens.
    /// @return The 0x...dEaD burn address.
    function burning_address() external view returns (address);

    /// @notice Returns the address of the primary marketplace.
    /// @return The primary marketplace address.
    function primary_marketplace() external view returns (address);

    /// @notice Returns the address of the secondary marketplace.
    /// @return The secondary marketplace address.
    function secondary_marketplace() external view returns (address);

    /// @notice Returns the administrator address of the license contract.
    /// @return The administrator address.
    function administrator() external view returns (address);

    /// @notice Returns the factory address that deployed this license contract.
    /// @return The factory contract address.
    function factory() external view returns (address);

    /// @notice Returns the current owner of the license contract.
    /// @return The owner address.
    function owner() external view returns (address);
}
