// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {ILicenseContract} from "./interfaces/ILicenseContract.sol";
import {IPrimaryMarketPlace} from "./interfaces/IPrimaryMarketPlace.sol";
import {Addresses} from "./constants/Addresses.sol";
import {Offer} from "./types/Types.sol";
import {onlyAdmin, TransferFailed, ZeroAddressInput} from "./errors/Common.sol";
import {
    notNFTOwner,
    priceIsInvalid,
    offerAlreadyActive,
    offerInactive,
    notSeller,
    cannotBuyYourOwnOffer,
    insufficientPayment,
    alreadyListed,
    UnApprovedNFT,
    ContractNotOwner
} from "./errors/SecondaryMarketPlace.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {ISecondaryMarketPlace} from "./interfaces/ISecondaryMarketPlace.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @author Vector Blockchain AG
 * @title SecondaryMarketPlace
 * @notice Marketplace contract for secondary trading of game license NFTs.
 * @dev Handles offer creation, acceptance, and removal. Integrates with PrimaryMarketPlace and LicenseContract. Only authorized addresses can manage offers and transfer NFTs.
 *
 * @custom:usage
 * - Users list NFTs for sale via `createOffer`.
 * - Buyers purchase NFTs via `acceptOffer`.
 * - Only authorized addresses can remove offers or set coordinator.
 * - Integrates with upgradeable proxy pattern (UUPS).
 */
contract SecondaryMarketPlace is
    Addresses,
    ReentrancyGuard,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ISecondaryMarketPlace,
    PausableUpgradeable,
    IERC721Receiver
{
    address private coordinator;
    address private factory;
    address private primaryMarketPlace;
    /// @notice List of all offers (active and inactive) on the secondary marketplace.
    Offer[] public offers;
    /// @notice Mapping from NFT tokenId to its offer details.
    mapping(uint256 => Offer) public offerById;
    /// @notice Mapping from NFT tokenId to its index in the offers array.
    mapping(uint256 => uint256) public tokenIdToOfferIndex;

    uint256[47] private __storageGap;

    uint256 private constant MAX_PRICE = 1 ether;

    /**
     * @notice Constructs the SecondaryMarketPlace contract.
     * @dev Disables initializers to prevent proxy misuse.
     */
    constructor() Addresses(msg.sender) {
        _disableInitializers();
    }

    /**
     * @notice Initializes the SecondaryMarketPlace contract.
     * @param _admin The administrator address.
     * @param _coordinator The coordinator address.
     * @param _factory The LicenseFactory address.
     * @param _primaryMarketPlace The PrimaryMarketPlace address.
     * @dev Can only be called once. Sets up ownership, UUPS, and pausable modules.
     */
    function initialize(
        address _admin,
        address _coordinator,
        address _factory,
        address _primaryMarketPlace
    ) public initializer {
        if (
            _admin == ZERO_ADDRESS ||
            _coordinator == ZERO_ADDRESS ||
            _factory == ZERO_ADDRESS ||
            _primaryMarketPlace == ZERO_ADDRESS
        ) {
            revert ZeroAddressInput();
        }
        if (_admin != ADMINISTRATOR) {
            revert onlyAdmin(_admin);
        }

        __Ownable_init(_admin);
        __UUPSUpgradeable_init();
        __Pausable_init();

        coordinator = _coordinator;
        factory = _factory;
        primaryMarketPlace = _primaryMarketPlace;
    }

    /* solhint-disable no-empty-blocks */
    /**
     * @notice Authorizes contract upgrades.
     * @param newImplementation The address of the new implementation.
     * @dev Only callable by the contract owner (UUPS pattern).
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
    /* solhint-enable no-empty-blocks */

    /**
     * @notice Create a new offer to sell an NFT.
     * @param tokenId The NFT ID to list for sale.
     * @param licenseAddress The address of the LicenseContract.
     * @param price The sale price in wei.
     * @dev Only the NFT owner can create an offer. NFT must be approved for this contract. Emits NewOfferCreated event.
     */
    function createOffer(
        uint256 tokenId,
        address licenseAddress,
        uint256 price
    ) external whenNotPaused nonReentrant {
        IPrimaryMarketPlace primaryMarket = IPrimaryMarketPlace(
            primaryMarketPlace
        );
        IPrimaryMarketPlace.GameNft memory gameNft = primaryMarket
            .getNftDetails(tokenId);

        ILicenseContract licenseContract = ILicenseContract(licenseAddress);
        if (
            !licenseContract.isApprovedForAll(msg.sender, address(this)) &&
            licenseContract.getApproved(tokenId) != address(this)
        ) {
            revert UnApprovedNFT(licenseAddress, tokenId);
        }

        if (gameNft.listedForSale == true) {
            revert alreadyListed(tokenId);
        }
        if (offerById[tokenId].isActive) {
            revert offerAlreadyActive(tokenId);
        }
        if (
            gameNft.owner != msg.sender ||
            licenseContract.ownerOf(tokenId) != msg.sender
        ) {
            revert notNFTOwner(msg.sender);
        }
        // here should be a logic to check if the game NFT is tradeable or not, involving a new attribute in primary mrktplace
        if (price <= 0 || price > MAX_PRICE) {
            revert priceIsInvalid(price);
        }

        Offer memory newOffer = Offer({
            seller: msg.sender,
            buyer: address(0),
            price: price,
            tokenId: tokenId,
            licenseAddress: licenseAddress,
            isActive: true
        });

        tokenIdToOfferIndex[tokenId] = offers.length;
        offers.push(newOffer);
        offerById[tokenId] = newOffer;

        primaryMarket.changeNftStatus(tokenId, true);
        primaryMarket.removeNftIdsFromUser(msg.sender, tokenId);

        licenseContract.safeTransferFrom(msg.sender, address(this), tokenId);

        emit NewOfferCreated(
            msg.sender,
            tokenId,
            licenseAddress,
            price,
            block.timestamp
        );
    }

    /**
     * @notice Remove an active offer for an NFT.
     * @param tokenId The NFT ID whose offer is to be removed.
     * @dev Only the seller or coordinator can remove an offer. Emits OfferRemoved event.
     */
    function removeOffer(uint256 tokenId) external whenNotPaused nonReentrant {
        Offer storage offer = offerById[tokenId];
        if (offer.isActive == false) {
            revert offerInactive(tokenId);
        }
        if (offer.seller != msg.sender && msg.sender != coordinator) {
            revert notSeller(msg.sender);
        }

        offer.isActive = false;
        uint256 arrayIndex = tokenIdToOfferIndex[tokenId];
        offers[arrayIndex].isActive = false;

        IPrimaryMarketPlace primaryMarket = IPrimaryMarketPlace(
            primaryMarketPlace
        );
        ILicenseContract licenseContract = ILicenseContract(
            offer.licenseAddress
        );

        primaryMarket.changeNftStatus(tokenId, false);
        primaryMarket.addToUserLicenseNftIds(msg.sender, tokenId);

        licenseContract.safeTransferFrom(address(this), msg.sender, tokenId);

        emit OfferRemoved(
            msg.sender,
            tokenId,
            offer.licenseAddress,
            block.timestamp
        );
    }

    /**
     * @notice Accept an active offer and purchase the NFT.
     * @param tokenId The NFT ID to purchase.
     * @dev Buyer must send the exact offer price. NFT is transferred to buyer. Emits OfferAccepted event.
     */
    function acceptOffer(
        uint256 tokenId
    ) external payable whenNotPaused nonReentrant {
        Offer storage offer = offerById[tokenId];
        if (offer.isActive == false) {
            revert offerInactive(tokenId);
        }
        if (msg.value != offer.price) {
            revert insufficientPayment(tokenId, msg.value);
        }
        if (offer.seller == msg.sender) {
            revert cannotBuyYourOwnOffer(msg.sender);
        }

        ILicenseContract licenseContract = ILicenseContract(
            offer.licenseAddress
        );

        if (licenseContract.ownerOf(tokenId) != address(this)) {
            revert ContractNotOwner();
        }

        offer.buyer = msg.sender;
        offer.isActive = false;

        uint256 arrayIndex = tokenIdToOfferIndex[tokenId];
        offers[arrayIndex].buyer = msg.sender;
        offers[arrayIndex].isActive = false;

        IPrimaryMarketPlace primaryMarket = IPrimaryMarketPlace(
            primaryMarketPlace
        );
        IPrimaryMarketPlace.GameNft memory nftData = primaryMarket
            .getNftDetails(tokenId);
        nftData.listedForSale = false;
        nftData.owner = msg.sender;
        primaryMarket.updateNftData(tokenId, nftData);
        primaryMarket.addToUserLicenseNftIds(msg.sender, tokenId);

        licenseContract.safeTransferFrom(address(this), msg.sender, tokenId);

        (bool success, ) = payable(offer.seller).call{value: offer.price}("");
        if (!success) {
            revert TransferFailed(msg.sender, offer.seller, offer.price);
        }

        emit OfferAccepted(
            offer.seller,
            msg.sender,
            tokenId,
            offer.licenseAddress,
            offer.price,
            block.timestamp
        );
    }

    /**
     * @notice Set the coordinator address.
     * @param newCoordinator The new coordinator address.
     * @dev Only callable by the contract owner.
     */
    function setCoordinator(address newCoordinator) external onlyOwner {
        coordinator = newCoordinator;
    }

    /**
     * @notice Get the offer details for a specific NFT.
     * @param tokenId The NFT ID.
     * @return The Offer struct.
     */
    function getOffer(uint256 tokenId) external view returns (Offer memory) {
        return offerById[tokenId];
    }

    /**
     * @notice Get all offers (active and inactive).
     * @return Array of Offer structs.
     */
    function getOffers() external view returns (Offer[] memory) {
        return offers;
    }

    /**
     * @notice Get all currently active (open) offers.
     * @return Array of active Offer structs.
     */
    function getOpenOffers() external view returns (Offer[] memory) {
        uint256 openCount = 0;
        for (uint256 i = 0; i < offers.length; ) {
            if (offers[i].isActive) {
                ++openCount;
            }
            unchecked {
                ++i;
            }
        }

        Offer[] memory openOffers = new Offer[](openCount);
        uint256 index = 0;
        for (uint256 i = 0; i < offers.length; ) {
            if (offers[i].isActive) {
                openOffers[index] = offers[i];
                ++index;
            }
            unchecked {
                ++i;
            }
        }
        return openOffers;
    }

    /**
     * @notice Pause the contract (emergency stop).
     * @dev Only callable by the contract owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract.
     * @dev Only callable by the contract owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /* solhint-disable no-unused-vars */
    /**
     * @notice Handles the receipt of an NFT (ERC721) to this contract.
     * @dev Always returns the selector to confirm the token transfer.
     * @param _operator The address which called `safeTransferFrom`.
     * @param _from The address which previously owned the token.
     * @param _tokenId The NFT identifier which is being transferred.
     * @param _data Additional data with no specified format.
     * @return The selector to confirm the token transfer.
     * @custom:solhint-disable-next-line no-unused-vars
     */
    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes calldata _data
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
    /* solhint-enable no-unused-vars */
}
