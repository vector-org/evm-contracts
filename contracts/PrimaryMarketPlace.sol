// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ILicenseContract} from "./Interfaces/ILicenseContract.sol";
import {ILicenseFactory} from "./Interfaces/ILicenseFactory.sol";
import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {Addresses} from "./Constants/Addresses.sol";

contract PrimaryMarketPlace is Addresses{
    struct GameNFT{
        address owner;
        string uri;
    }
    address private immutable primaryMarketplace = address(this);
    address public owner;
    address private coordinator;
    address private factory;
    mapping(uint256 => GameNFT) public gameNFTs;
    uint256[] public allNFTIDs;

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    
    event Mint(address indexed to, address indexed licenseAddress, string uri, uint256 timestamp);

    modifier onlyAdmin{
        require(msg.sender == Addresses.ADMINISTRATOR, "You are not the administrator");
        _;
    }

    modifier onlyOwner{
        require(msg.sender == owner, "You are not the owner");
        _;
    }

    constructor(
        address _owner,
        address _coordinator,
        address _factory
    ) onlyAdmin{
        owner = _owner;
        coordinator = _coordinator;
        factory = _factory;
    }

    function mintLicense(uint256 licenseId, address _receiver, string memory uri) external {
        ILicenseFactory licenseFactory = ILicenseFactory(factory);
        ILicenseFactory.License memory License = licenseFactory.getLicenseFromID(licenseId);
        require(License.isActive, "License is not active to be minted");
        address licenseAddress = License.contractAddress;

        ILicenseContract licenseContract = ILicenseContract(licenseAddress);
        uint256 nftId = _tokenIdCounter.current();
        licenseContract.safeMint(uri, _receiver, nftId);
        _tokenIdCounter.increment();

        gameNFTs[nftId] = GameNFT({
            owner: _receiver,
            uri: uri
        });
        allNFTIDs.push(nftId);
        emit Mint(_receiver, licenseAddress, uri, block.timestamp);
    }

    function getAllNFTIds() external view returns (uint256[] memory) {
        return allNFTIDs;
    }

    function getNFTDetails(uint256 nftId) external view returns (GameNFT memory) {
        return gameNFTs[nftId];
    }
}