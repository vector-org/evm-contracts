// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {
    ERC721URIStorage
} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Addresses} from "./constants/Addresses.sol";

contract LicenseContract is ERC721URIStorage, Addresses {
    address public owner;
    address public immutable factory;

    modifier onlyFactory(){
        require(msg.sender == factory, "Only factory can call this function");
        _;
    }

    constructor(string memory name, string memory symbol, address _factory) ERC721(name, symbol) onlyFactory {
        factory = _factory;
        owner = msg.sender;
    }

    function safeMint(string memory uri, address to, uint256 licenseId) public {
        _safeMint(to, licenseId);
        _setTokenURI(licenseId, uri);
    }

    function tokenURI(
        uint256 licenseId
    ) public view override returns (string memory) {
        return super.tokenURI(licenseId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 licenseId
    ) internal virtual override {
        require(
            from == address(0) ||
                msg.sender == PRIMARYMARKETPLACE ||
                msg.sender == SECONDARYMARKETPLACE,
            "not an authorized marketplace"
        );
        super._beforeTokenTransfer(from, to, licenseId);
    }
}
