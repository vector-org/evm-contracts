// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IPrimaryMarketPlace
/// @notice Interface for the PrimaryMarketPlace contract that mints NFTs via License contracts.
interface IPrimaryMarketPlace {
    /// @notice Struct storing information about a minted Game NFT.
    struct GameNFT {
        address owner;
        string uri;
    }

    /// @notice Emitted when a new NFT is minted via a license contract.
    /// @param to Address receiving the NFT.
    /// @param licenseAddress The LicenseContract address used for minting.
    /// @param uri The metadata URI of the NFT.
    /// @param timestamp The block timestamp when minting occurred.
    event Mint(
        address indexed to,
        address indexed licenseAddress,
        string uri,
        uint256 timestamp
    );

    /// @notice Mint a new NFT via a License contract for a given license ID.
    /// @dev Requires the license to be active.
    /// @param licenseId The license ID managed by the factory.
    /// @param _receiver The address to receive the minted NFT.
    /// @param uri The metadata URI to assign to the NFT.
    function mintLicense(uint256 licenseId, address _receiver, string memory uri) external;

    /// @notice Get the list of all NFT IDs minted through this contract.
    /// @return An array of NFT token IDs.
    function getAllNFTIds() external view returns (uint256[] memory);

    /// @notice Get metadata and ownership information of a specific NFT ID.
    /// @param nftId The NFT token ID.
    /// @return A GameNFT struct with owner and URI.
    function getNFTDetails(uint256 nftId) external view returns (GameNFT memory);
}
