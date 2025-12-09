// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @author Vector Blockchain AG
/// @title IPrimaryMarketPlace
/// @notice Interface for the PrimaryMarketPlace contract that mints NFTs via License contracts, manages NFT status, and updates NFT metadata.
interface IPrimaryMarketPlace {
    /// @notice Struct storing information about a minted Game NFT.
    struct GameNft {
        address owner;
        string uri;
        uint256 licenseId;
        address licenseAddress;
        bool listedForSale;
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

    /// @notice Emitted when an NFT's listedForSale status is changed.
    /// @param user The user initiating the status change.
    /// @param status The new sale status.
    /// @param tokenId The NFT token ID.
    /// @param timestamp The block timestamp of the change.
    event NFTStatusChange(
        address indexed user,
        bool status,
        uint256 indexed tokenId,
        uint256 timestamp
    );

    /// @notice Emitted when NFT metadata is updated.
    /// @param user The user initiating the update.
    /// @param owner The new owner address.
    /// @param licenseAddress The license contract address.
    /// @param uri The new metadata URI.
    /// @param timestamp The block timestamp of the update.
    event NFTDataUpdate(
        address indexed user,
        address indexed owner,
        address indexed licenseAddress,
        string uri,
        uint256 timestamp
    );

    /// @notice Emitted when the payment token address is updated.
    /// @param oldToken The previous payment token address.
    /// @param newToken The new payment token address.
    /// @param updatedBy The address that performed the update (owner).
    /// @param timestamp The block timestamp of the update.
    event PaymentTokenUpdated(
        address indexed oldToken,
        address indexed newToken,
        address indexed updatedBy,
        uint256 timestamp
    );

    /// @notice Emitted when a mintAuthority mints a license without payment.
    /// @param to Address receiving the NFT.
    /// @param licenseAddress The LicenseContract address used for minting.
    /// @param licenseId The license ID.
    /// @param uri The metadata URI of the NFT.
    /// @param timestamp The block timestamp when minting occurred.
    event AdminMint(
        address indexed to,
        address indexed licenseAddress,
        uint256 indexed licenseId,
        string uri,
        uint256 timestamp
    );

    /// @notice Emitted when the mint authority address is updated.
    /// @param newAuthority The new mint authority address.
    /// @param updatedBy The address that performed the update.
    /// @param timestamp The block timestamp of the update.
    event MintAuthorityUpdated(
        address indexed newAuthority,
        address indexed updatedBy,
        uint256 timestamp
    );

    /// @notice Mint a new NFT via a License contract for a given license ID.
    /// @dev Requires the license to be active. User must approve USDC spending before calling.
    /// @param licenseId The license ID managed by the factory.
    /// @param _receiver The address to receive the minted NFT.
    /// @param uri The metadata URI to assign to the NFT.
    function mintLicense(
        uint256 licenseId,
        address _receiver,
        string memory uri
    ) external;

    /// @notice Get the list of all NFT IDs minted through this contract.
    /// @return An array of NFT token IDs.
    function getAllNftIds() external view returns (uint256[] memory);

    /// @notice Get metadata and ownership information of a specific NFT ID.
    /// @param nftId The NFT token ID.
    /// @return A GameNft struct with all NFT metadata and ownership info.
    function getNftDetails(
        uint256 nftId
    ) external view returns (GameNft memory);

    /// @notice Change the listed-for-sale status of an NFT.
    /// @param nftId The NFT token ID.
    /// @param status The new listedForSale status.
    function changeNftStatus(uint256 nftId, bool status) external;

    /// @notice Add an NFT ID to a user's list of owned NFTs.
    /// @param user The address of the user.
    /// @param nftId The NFT token ID to add.
    function addToUserLicenseNftIds(address user, uint256 nftId) external;

    /// @notice Remove an NFT ID from a user's list of owned NFTs.
    /// @param user The address of the user.
    /// @param nftId The NFT token ID to remove.
    function removeNftIdsFromUser(address user, uint256 nftId) external;

    /// @notice Get all NFT IDs owned by a specific user.
    /// @param user The address of the user.
    /// @return An array of NFT token IDs owned by the user.
    function getUserNftIds(
        address user
    ) external view returns (uint256[] memory);

    /// @notice Update all data fields of an NFT.
    /// @dev Replaces the existing NFT struct entirely.
    /// @param nftId The NFT token ID.
    /// @param nftData The new GameNFT data.
    function updateNftData(uint256 nftId, GameNft memory nftData) external;

    /// @notice Mint a license NFT to a user without payment (mintAuthority only).
    /// @dev Used for Steam Legacy feature. Only mintAuthority or admin can call.
    /// @param licenseId The license ID managed by the factory.
    /// @param _receiver The address to receive the minted NFT.
    /// @param uri The metadata URI to assign to the NFT.
    function adminMintTo(
        uint256 licenseId,
        address _receiver,
        string memory uri
    ) external;

    /// @notice Set the mint authority address.
    /// @param _mintAuthority The new mint authority address.
    function setMintAuthority(address _mintAuthority) external;
}
