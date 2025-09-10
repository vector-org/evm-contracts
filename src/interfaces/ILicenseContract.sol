// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @author DJ (PlayOnVector)
/// @title ILicenseContract
/// @notice Interface for interacting with the LicenseContract ERC-721 implementation with restricted minting and transfer rules.
interface ILicenseContract {
    /// @notice Mints a new license NFT to a specified address.
    /// @dev Only callable by authorized marketplaces.
    /// @param uri The metadata URI associated with the license.
    /// @param to The recipient address of the license.
    /// @param licenseId The token ID for the license.
    function safeMint(
        string memory uri,
        address to,
        uint256 licenseId
    ) external;

    /// @notice Updates the token URI of an existing license NFT.
    /// @dev Only callable by the contract owner, administrator, or factory.
    /// @param licenseId The ID of the license token.
    /// @param newUri The new metadata URI.
    function updateTokenURI(uint256 licenseId, string memory newUri) external;

    /// @notice Returns the current token URI for a license.
    /// @param licenseId The ID of the license token.
    /// @return A string containing the metadata URI.
    function tokenURI(uint256 licenseId) external view returns (string memory);

    /// @notice Returns the administrator address of the license contract.
    /// @return The administrator address.
    function administrator() external view returns (address);

    /// @notice Returns the factory address that deployed this license contract.
    /// @return The factory contract address.
    function factory() external view returns (address);

    /// @notice Returns the current owner of the license contract.
    /// @return The owner address.
    function owner() external view returns (address);

    /// @notice Returns the balance of tokens held by a given address.
    /// @param owner The address to check the balance for.
    /// @return The number of tokens owned by the address.
    function balanceOf(address owner) external view returns (uint256);

    /// @notice Returns the owner of the given token ID.
    /// @param tokenId The ID of the token to check.
    /// @return The address of the token owner.
    function ownerOf(uint256 tokenId) external view returns (address);

    /// @notice Approves another address to transfer the given token ID.
    /// @dev Approval is cleared when the token is transferred.
    /// @param to The address to approve for transfer.
    /// @param tokenId The ID of the token to approve.
    function approve(address to, uint256 tokenId) external;

    /// @notice Returns the address approved for the given token ID.
    /// @param tokenId The ID of the token to check.
    /// @return The address approved to transfer the token, or zero if none.
    function getApproved(uint256 tokenId) external view returns (address);

    /// @notice Checks if an operator is approved to manage all of an owner's assets.
    /// @param owner The address of the token owner.
    /// @param operator The address of the operator to check.
    /// @return True if the operator is approved, false otherwise.
    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool);

    /// @notice Transfers a token from one address to another.
    /// @dev This function does not check for the receiver's support of the ERC721 interface.
    /// @param from The address to transfer the token from.
    /// @param to The address to transfer the token to.
    /// @param tokenId The ID of the token to transfer.
    function transferFrom(address from, address to, uint256 tokenId) external;

    /// @notice Safe transfer (ERC721) with checks.
    /// @dev Ensures the recipient can handle ERC721 tokens.
    /// @param from The address to transfer the token from.
    /// @param to The address to transfer the token to.
    /// @param tokenId The ID of the token to transfer.
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
}
