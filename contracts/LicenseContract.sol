// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
 
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
 
contract LicenseContract is ERC721URIStorage{
    address internal burning_address = 0x000000000000000000000000000000000000dEaD;
    address private immutable primary_marketplace = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address private immutable secondary_marketplace = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address private immutable administrator = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address public owner;
 
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {
        owner = msg.sender;
    }
 
    function safeMint(string memory uri,  address to, uint256 licenseId) public {
        _safeMint(to, licenseId);
        _setTokenURI(licenseId, uri);
    }
 
    function tokenURI(uint256 licenseId)
        public
        view
        override
        returns (string memory)
    {
        return super.tokenURI(licenseId);
    }

    function _beforeTokenTransfer(
    address from, 
    address to, 
    uint256 licenseId
    ) internal override virtual {
        require(from == address(0) || msg.sender == primary_marketplace || msg.sender == secondary_marketplace,"Only authorized marketplaces can transfer tokens");
        super._beforeTokenTransfer(from, to, licenseId);  
    }
}
 