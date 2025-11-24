// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
/**
 * @title Types
 * @notice Shared data structures for licenses, NFTs, and marketplace offers.
 * @dev Used by LicenseFactory, PrimaryMarketPlace, and SecondaryMarketPlace contracts.
 */

/// @notice Stores metadata and configuration for a deployed license contract.
/// @dev Updated to 2-party fee split (developer/platform) - publisher removed
struct License {
    address contractAddress;
    address owner;
    address coordinator;
    string name;
    string symbol;
    string uri;
    bool isActive;
    uint256 timestamp;
    uint256 developerFee;
    uint256 platformFee;
    address developer;
    address platform;
}

/// @notice Input parameters for creating a new license contract.
/// @dev Updated to 2-party fee split (developer/platform) - publisher removed
struct LicenseInput {
    string name;
    string symbol;
    string uri;
    bool isActive;
    uint256 totalFee;
    address developer;
    address platform;
    address primaryMarketplace;
    address secondaryMarketplace;
}

/// @notice Metadata for a minted game license NFT.
struct GameNft {
    address owner;
    string uri;
    uint256 licenseId;
    address licenseAddress;
    bool listedForSale;
}

/// @notice Offer details for secondary marketplace listings.
struct Offer {
    address seller;
    address buyer;
    uint256 price;
    uint256 tokenId;
    address licenseAddress;
    bool isActive;
}
