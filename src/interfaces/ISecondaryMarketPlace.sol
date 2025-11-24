// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Offer} from "../types/Types.sol";

/// @author Vector Blockchain AG
/// @title ISecondaryMarketPlace
/// @notice Interface for the SecondaryMarketPlace contract that manages secondary sales of NFTs (offers, acceptances, removals).
interface ISecondaryMarketPlace {
    /// @notice Emitted when a new offer is created for an NFT.
    /// @param seller The address of the NFT owner creating the offer.
    /// @param tokenId The NFT token ID being offered.
    /// @param licenseAddress The address of the LicenseContract for the NFT.
    /// @param price The price set for the offer.
    /// @param timestamp The block timestamp when the offer was created.
    event NewOfferCreated(
        address indexed seller,
        uint256 indexed tokenId,
        address indexed licenseAddress,
        uint256 price,
        uint256 timestamp
    );

    /// @notice Emitted when an offer is removed.
    /// @param seller The address of the offer creator or coordinator.
    /// @param tokenId The NFT token ID whose offer is removed.
    /// @param licenseAddress The address of the LicenseContract for the NFT.
    /// @param timestamp The block timestamp when the offer was removed.
    event OfferRemoved(
        address indexed seller,
        uint256 indexed tokenId,
        address indexed licenseAddress,
        uint256 timestamp
    );

    /// @notice Emitted when an offer is accepted and the NFT is sold.
    /// @param seller The address of the NFT seller.
    /// @param buyer The address of the NFT buyer.
    /// @param tokenId The NFT token ID sold.
    /// @param licenseAddress The address of the LicenseContract for the NFT.
    /// @param price The sale price.
    /// @param timestamp The block timestamp when the offer was accepted.
    event OfferAccepted(
        address indexed seller,
        address indexed buyer,
        uint256 indexed tokenId,
        address licenseAddress,
        uint256 price,
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

    /// @notice Emitted when an offer price is updated.
    /// @param seller The address of the seller.
    /// @param tokenId The NFT token ID.
    /// @param oldPrice The previous price.
    /// @param newPrice The new price.
    /// @param timestamp The block timestamp of the update.
    event OfferUpdated(
        address indexed seller,
        uint256 indexed tokenId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );

    /// @notice Create a new offer for an NFT.
    /// @param tokenId The NFT token ID to offer.
    /// @param licenseAddress The address of the LicenseContract for the NFT.
    /// @param price The price for the offer (must be positive).
    function createOffer(
        uint256 tokenId,
        address licenseAddress,
        uint256 price
    ) external;

    /// @notice Remove an active offer for an NFT.
    /// @param tokenId The NFT token ID whose offer is to be removed.
    function removeOffer(uint256 tokenId) external;

    /// @notice Accept an active offer and purchase the NFT.
    /// @param tokenId The NFT token ID to buy.
    /// @dev The caller must approve ERC20 token spending before calling.
    function acceptOffer(uint256 tokenId) external;

    /// @notice Set the coordinator address (admin only).
    /// @param newCoordinator The new coordinator address.
    function setCoordinator(address newCoordinator) external;

    /// @notice Update the payment token address (allows switching between ERC20 tokens).
    /// @param _newPaymentToken The address of the new ERC20 payment token (e.g., USDC, USDT).
    function setPaymentToken(address _newPaymentToken) external;

    /// @notice Edit the price of an existing active offer.
    /// @param tokenId The NFT token ID whose offer price is to be updated.
    /// @param newPrice The new price for the offer.
    function editOffer(uint256 tokenId, uint256 newPrice) external;

    /// @notice Get the offer details for a specific NFT token ID.
    /// @param tokenId The NFT token ID.
    /// @return The Offer struct for the tokenId.
    function getOffer(uint256 tokenId) external view returns (Offer memory);

    /// @notice Get all offers (active and inactive).
    /// @return An array of all Offer structs.
    function getOffers() external view returns (Offer[] memory);

    /// @notice Get all currently active (open) offers.
    /// @return An array of active Offer structs.
    function getOpenOffers() external view returns (Offer[] memory);
}
