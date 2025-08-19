// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ILicenseContract} from "./interfaces/ILicenseContract.sol";
import {IPrimaryMarketPlace} from "./interfaces/IPrimaryMarketPlace.sol";
import {Addresses} from "./constants/Addresses.sol";
import {Offer} from "./types/Types.sol";
import {onlyOwner, onlyAdmin} from "./errors/Common.sol";
import {
    notNFTOwner,
    priceIsNotPositive,
    offerAlreadyActive,
    offerInactive,
    notSeller,
    cannotBuyYourOwnOffer,
    insufficientPayment,
    alreadyListed,
    UnApprovedNFT,
    SellerNotOwner,
    ReentrantCall,
    TransferFailed
} from "./errors/SecondaryMarketPlace.sol";

contract SecondaryMarketPlace is Addresses {
    address public owner;
    address private coordinator;
    address private factory;
    address private primaryMarketPlace;
    Offer[] public offers;
    mapping(uint256 => Offer) public offerById;
    mapping(uint256 => uint256) public tokenIdToOfferIndex;
    bool private _locked;

    event NewOfferCreated(
        address indexed seller,
        uint256 indexed tokenId,
        address indexed licenseAddress,
        uint256 price,
        uint256 timestamp
    );

    event OfferRemoved(
        address indexed seller,
        uint256 indexed tokenId,
        address indexed licenseAddress,
        uint256 timestamp
    );

    event OfferAccepted(
        address indexed seller,
        address indexed buyer,
        uint256 indexed tokenId,
        address licenseAddress,
        uint256 price,
        uint256 timestamp
    );

    constructor(
        address _owner,
        address _coordinator,
        address _factory,
        address _primaryMarketPlace
    ) {
        if (msg.sender != Addresses.ADMINISTRATOR) {
            revert onlyAdmin(msg.sender);
        }
        owner = _owner;
        coordinator = _coordinator;
        factory = _factory;
        primaryMarketPlace = _primaryMarketPlace;
    }

    modifier checkIsOwner() {
        if (msg.sender != owner) {
            revert onlyOwner(msg.sender);
        }
        _;
    }

    modifier nonReentrant() {
        if (_locked) {
            revert ReentrantCall();
        }
        _locked = true;
        _;
        _locked = false;
    }

    function createOffer(
        uint256 tokenId,
        address licenseAddress,
        uint256 price
    ) external nonReentrant {
        IPrimaryMarketPlace primaryMarket = IPrimaryMarketPlace(
            primaryMarketPlace
        );
        IPrimaryMarketPlace.GameNFT memory gameNFT = primaryMarket
            .getNFTDetails(tokenId);

        ILicenseContract licenseContract = ILicenseContract(licenseAddress);
        if (
            !licenseContract.isApprovedForAll(msg.sender, address(this)) &&
            licenseContract.getApproved(tokenId) != address(this)
        ) {
            revert UnApprovedNFT(licenseAddress, tokenId);
        }

        if (gameNFT.listedForSale == true) {
            revert alreadyListed(tokenId);
        }
        if (offerById[tokenId].isActive) {
            revert offerAlreadyActive(tokenId);
        }
        if (
            gameNFT.owner != msg.sender ||
            licenseContract.ownerOf(tokenId) != msg.sender
        ) {
            revert notNFTOwner(msg.sender);
        }
        // here should be a logic to check if the game NFT is tradeable or not, involving a new attribute in primary mrktplace
        if (price <= 0) {
            revert priceIsNotPositive(price);
        }

        primaryMarket.changeNFTStatus(tokenId, true);

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

        emit NewOfferCreated(
            msg.sender,
            tokenId,
            licenseAddress,
            price,
            block.timestamp
        );
    }

    function removeOffer(uint256 tokenId) external {
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
        primaryMarket.changeNFTStatus(tokenId, false);

        emit OfferRemoved(
            msg.sender,
            tokenId,
            offer.licenseAddress,
            block.timestamp
        );
    }

    function acceptOffer(uint256 tokenId) external payable nonReentrant {
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

        if (
            !licenseContract.isApprovedForAll(offer.seller, address(this)) &&
            licenseContract.getApproved(tokenId) != address(this)
        ) {
            revert UnApprovedNFT(offer.licenseAddress, tokenId);
        }

        if (licenseContract.ownerOf(tokenId) != offer.seller) {
            revert SellerNotOwner(offer.seller);
        }

        offer.buyer = msg.sender;
        offer.isActive = false;

        uint256 arrayIndex = tokenIdToOfferIndex[tokenId];
        offers[arrayIndex].buyer = msg.sender;
        offers[arrayIndex].isActive = false;

        IPrimaryMarketPlace primaryMarket = IPrimaryMarketPlace(
            primaryMarketPlace
        );
        IPrimaryMarketPlace.GameNFT memory nftData = primaryMarket
            .getNFTDetails(tokenId);
        nftData.listedForSale = false;
        nftData.owner = msg.sender;
        primaryMarket.updateNFTData(tokenId, nftData);


        (bool success, ) = payable(offer.seller).call{value: offer.price}("");
        if (!success) {
            revert TransferFailed(offer.seller, msg.sender, offer.price);
        }

        licenseContract.safeTransferFrom(offer.seller, msg.sender, tokenId);

        emit OfferAccepted(
            offer.seller,
            msg.sender,
            tokenId,
            offer.licenseAddress,
            offer.price,
            block.timestamp
        );
    }

    function setOwner(address newOwner) external checkIsOwner {
        owner = newOwner;
    }

    function setCoordinator(address newCoordinator) external checkIsOwner {
        coordinator = newCoordinator;
    }

    function getOffer(uint256 tokenId) external view returns (Offer memory) {
        return offerById[tokenId];
    }

    function getOffers() external view returns (Offer[] memory) {
        return offers;
    }

    function getOpenOffers() external view returns (Offer[] memory) {
        uint256 openCount = 0;
        for (uint256 i = 0; i < offers.length; i++) {
            if (offers[i].isActive) {
                openCount++;
            }
        }

        Offer[] memory openOffers = new Offer[](openCount);
        uint256 index = 0;
        for (uint256 i = 0; i < offers.length; i++) {
            if (offers[i].isActive) {
                openOffers[index] = offers[i];
                index++;
            }
        }
        return openOffers;
    }
}
