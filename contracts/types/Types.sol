// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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
    uint256 publisherFee;
    address developer;
    address publisher;
    address platform;
}

struct LicenseInput {
    string name;
    string symbol;
    string uri;
    bool isActive;
    uint256 developerFee;
    uint256 platformFee;
    uint256 publisherFee;
    address developer;
    address publisher;
    address platform;
    address primaryMarketplace;
    address secondaryMarketplace;
}

struct GameNFT {
    address owner;
    string uri;
    uint256 licenseId;
    address licenseAddress;
    bool listedForSale;
}

struct Offer {
    address seller;
    address buyer;
    uint256 price;
    uint256 tokenId;
    address licenseAddress;
    bool isActive;
}
