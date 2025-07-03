// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
 
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
 
contract LicenseContract is ERC721URIStorage{
    address internal burning_address = 0x000000000000000000000000000000000000dEaD;
    address private immutable primary_marketplace = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address private immutable secondary_marketplace = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address private immutable administrator = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address private immutable factory = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address public owner;
 
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) onlyFactory {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == administrator, "Only the administrator can call this function");
        _;
    }

    modifier onlyMarketplace() {
        require(
            msg.sender == primary_marketplace || msg.sender == secondary_marketplace,
            "Only authorized marketplaces can call this function"
        );
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Only the factory can call this function");
        _;
    }
 
    function safeMint(string memory uri,  address to, uint256 licenseId) external onlyMarketplace {
        _safeMint(to, licenseId);
        _setTokenURI(licenseId, uri);
    }

    function updateTokenURI(uint256 licenseId, string memory newUri) external {
        require(msg.sender == owner || msg.sender == administrator || msg.sender == factory, "Only the owner or administrator can update the URI");
        _setTokenURI(licenseId, newUri);
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
    ) internal override virtual onlyMarketplace {
        require(ownerOf(licenseId) == from, "Only the owner can transfer tokens");
        super._beforeTokenTransfer(from, to, licenseId);  
    }
}
