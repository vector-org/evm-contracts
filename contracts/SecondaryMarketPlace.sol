// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ILicenseContract} from "./interfaces/ILicenseContract.sol";
import {IPrimaryMarketPlace} from "./interfaces/IPrimaryMarketPlace.sol";
import {IPrimaryMarketPlace} from "./interfaces/IPrimaryMarketPlace.sol";
import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {Addresses} from "./constants/Addresses.sol";
import {Offer} from "./types/Types.sol";

contract SecondaryMarketPlace is Addresses {
    address private immutable secondary_marketplace = address(this);
    address public owner;
    address private coordinator;
    address private factory;
    address private primaryMarketPlace;
    Offer[] public offers;
    mapping(uint256 => Offer) public offerById;

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

    event ReceivedETH(
        address indexed sender,
        uint256 amount,
        uint256 timestamp
    );

    constructor(
        address _owner,
        address _coordinator,
        address _factory,
        address _primaryMarketPlace
    ) Addresses() {
        require(
            msg.sender == Addresses.ADMINISTRATOR,
            "You are not the administrator"
        );
        owner = _owner;
        coordinator = _coordinator;
        factory = _factory;
        primaryMarketPlace = _primaryMarketPlace;
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "You are not the owner to call the function"
        );
        _;
    }

    function createOffer(
        uint256 tokenId,
        address licenseAddress,
        uint256 price
    ) external {
        IPrimaryMarketPlace primaryMarket = IPrimaryMarketPlace(
            primaryMarketPlace
        );
        IPrimaryMarketPlace.GameNFT memory gameNFT = primaryMarket
            .getNFTDetails(tokenId);
        require(
            gameNFT.owner == msg.sender,
            "You are not the owner of this token"
        );
        // here should be a logic to check if the game NFT is tradeable or not
        require(price > 0, "Price must be greater than zero");

        Offer memory newOffer = Offer({
            seller: msg.sender,
            buyer: address(0),
            price: price,
            tokenId: tokenId,
            licenseAddress: licenseAddress,
            isActive: true
        });

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
        require(offer.isActive, "Offer is not active");
        require(
            offer.seller == msg.sender || msg.sender == coordinator,
            "You are not the seller of this offer"
        );

        offer.isActive = false;

        emit OfferRemoved(
            msg.sender,
            tokenId,
            offer.licenseAddress,
            block.timestamp
        );
    }

    function acceptOffer(uint256 tokenId) external payable {
        Offer storage offer = offerById[tokenId];
        require(offer.isActive, "Offer is not active");
        require(msg.value >= offer.price, "Insufficient payment");
        require(offer.seller != msg.sender, "You cannot buy your own offer");

        ILicenseContract licenseContract = ILicenseContract(
            offer.licenseAddress
        );
        licenseContract.safeTransferFrom(offer.seller, msg.sender, tokenId);

        payable(offer.seller).transfer(offer.price);

        offer.buyer = msg.sender;
        offer.isActive = false;

        emit OfferRemoved(
            offer.seller,
            tokenId,
            offer.licenseAddress,
            block.timestamp
        );

        emit OfferAccepted(
            offer.seller,
            msg.sender,
            tokenId,
            offer.licenseAddress,
            offer.price,
            block.timestamp
        );
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function setCoordinator(address newCoordinator) external onlyOwner {
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

    receive() external payable {
        emit ReceivedETH(msg.sender, msg.value, block.timestamp);
    }
}
