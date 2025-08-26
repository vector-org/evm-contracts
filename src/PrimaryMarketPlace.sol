// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {ILicenseContract} from "./interfaces/ILicenseContract.sol";
import {ILicenseFactory} from "./interfaces/ILicenseFactory.sol";
import {Addresses} from "./constants/Addresses.sol";
import {GameNFT} from "./types/Types.sol";
import {onlyAdmin, onlyOwner} from "./errors/Common.sol";
import {licenseNotActive} from "./errors/PrimaryMarketPlace.sol";

contract PrimaryMarketPlace is
    Addresses,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    address private immutable primaryMarketplace = address(this);
    address private coordinator;
    address private factory;
    mapping(uint256 => GameNFT) public gameNFTs;
    uint256[] public allNFTIDs;

    uint256 private _tokenIdCounter;

    event Mint(
        address indexed to,
        address indexed licenseAddress,
        string uri,
        uint256 timestamp
    );

    event NFTStatusChange(
        address indexed user,
        bool status,
        uint256 indexed tokenId,
        uint256 timestamp
    );

    event NFTDataUpdate(
        address indexed user,
        address indexed owner,
        address indexed licenseAddress,
        string uri,
        uint256 timestamp
    );

    modifier checkIsAdmin() {
        if (msg.sender != Addresses.ADMINISTRATOR) {
            revert onlyAdmin(msg.sender);
        }
        _;
    }

    constructor() Addresses(msg.sender) checkIsAdmin() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        address _coordinator,
        address _factory
    ) public initializer {
        __Ownable_init(_admin);
        __UUPSUpgradeable_init();

        if (_admin != ADMINISTRATOR) {
            revert onlyAdmin(_admin);
        }
        coordinator = _coordinator;
        factory = _factory;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function mintLicense(
        uint256 licenseId,
        address _receiver,
        string memory uri
    ) external {
        ILicenseFactory licenseFactory = ILicenseFactory(factory);
        ILicenseFactory.License memory License = licenseFactory
            .getLicenseFromID(licenseId);
        if (License.isActive == false) {
            revert licenseNotActive(licenseId);
        }
        address licenseAddress = License.contractAddress;

        ILicenseContract licenseContract = ILicenseContract(licenseAddress);
        uint256 nftId = _tokenIdCounter;
        licenseContract.safeMint(uri, _receiver, nftId);
        _tokenIdCounter++;

        gameNFTs[nftId] = GameNFT({
            owner: _receiver,
            uri: uri,
            licenseId: licenseId,
            licenseAddress: licenseAddress,
            listedForSale: false
        });
        allNFTIDs.push(nftId);
        emit Mint(_receiver, licenseAddress, uri, block.timestamp);
    }

    function getAllNFTIds() external view returns (uint256[] memory) {
        return allNFTIDs;
    }

    function getNFTDetails(
        uint256 nftId
    ) external view returns (GameNFT memory) {
        return gameNFTs[nftId];
    }

    function changeNFTStatus(uint256 nftId, bool status) external {
        gameNFTs[nftId].listedForSale = status;
        emit NFTStatusChange(msg.sender, status, nftId, block.timestamp);
    }

    function updateNFTData(uint256 nftId, GameNFT memory nftData) external {
        gameNFTs[nftId] = nftData;
        emit NFTDataUpdate(
            msg.sender,
            nftData.owner,
            nftData.licenseAddress,
            nftData.uri,
            block.timestamp
        );
    }
}
