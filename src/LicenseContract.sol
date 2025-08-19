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
    address public immutable FACTORY;
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
        FACTORY = _factory;
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
            msg.sender != FACTORY &&
            msg.sender != Addresses.ADMINISTRATOR
        ) {
            revert notOwnerOrFactory(msg.sender);
        }
        _setTokenURI(licenseId, newUri);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        if (
            from != address(0) &&
            auth != PRIMARYMARKETPLACE &&
            auth != SECONDARYMARKETPLACE
        ) {
            revert notPrimaryOrSecondary(auth);
        }

        if (to == address(0)) {
            _setTokenURI(tokenId, "");
        }

        return super._update(to, tokenId, auth);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
