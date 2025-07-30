// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Addresses} from "./constants/Addresses.sol";
import {
    notFactory,
    notOwnerOrFactory,
    notPrimaryOrSecondary
} from "./errors/LicenseContract.sol";

contract LicenseContract is ERC721, ERC721URIStorage, Addresses {
    address public owner;
    address public immutable factory;
    address public immutable PRIMARYMARKETPLACE;
    address public immutable SECONDARYMARKETPLACE;

    modifier onlyFactory(address _factory) {
        if (msg.sender != _factory) {
            revert notFactory(msg.sender);
        }
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address _factory,
        address primaryMarketplace,
        address secondaryMarketplace
    ) ERC721(name, symbol) onlyFactory(_factory) {
        factory = _factory;
        owner = msg.sender;
        PRIMARYMARKETPLACE = primaryMarketplace;
        SECONDARYMARKETPLACE = secondaryMarketplace;
    }

    function safeMint(string memory uri, address to, uint256 licenseId) public {
        _safeMint(to, licenseId);
        _setTokenURI(licenseId, uri);
    }

    function tokenURI(
        uint256 licenseId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(licenseId);
    }

    function updateTokenURI(uint256 licenseId, string memory newUri) public {
        if (
            msg.sender != owner &&
            msg.sender != factory &&
            msg.sender != Addresses.ADMINISTRATOR
        ) {
            revert notOwnerOrFactory(msg.sender);
        }
        _setTokenURI(licenseId, newUri);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 licenseId,
        uint256 batchSize
    ) internal virtual override {
        if (
            from != address(0) &&
            msg.sender != PRIMARYMARKETPLACE &&
            msg.sender != SECONDARYMARKETPLACE
        ) {
            revert notPrimaryOrSecondary(msg.sender);
        }
        super._beforeTokenTransfer(from, to, licenseId, batchSize);
    }

    function _burn(
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
