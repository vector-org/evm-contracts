// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {ILicenseContract} from "./interfaces/ILicenseContract.sol";
import {ILicenseFactory} from "./interfaces/ILicenseFactory.sol";
import {Addresses} from "./constants/Addresses.sol";
import {GameNft} from "./types/Types.sol";
import {
    onlyAdmin,
    onlyOwner,
    TransferFailed,
    UnAuthorizedUser
} from "./errors/Common.sol";
import {
    licenseNotActive,
    NotSufficientETH
} from "./errors/PrimaryMarketPlace.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

contract PrimaryMarketPlace is
    Addresses,
    ReentrancyGuard,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    address private immutable PRIMARY_MARKETPLACE = address(this);
    address private coordinator;
    address private factory;
    address private secondaryMarketPlace;
    mapping(uint256 => GameNft) public gameNfts;
    uint256[] public allNftIds;

    uint256 private _tokenIdCounter;

    uint256[47] private __storageGap;

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

    modifier isAuthorizedForSecondary() {
        if (
            msg.sender != coordinator &&
            msg.sender != ADMINISTRATOR &&
            msg.sender != secondaryMarketPlace
        ) {
            revert UnAuthorizedUser(msg.sender);
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
    ) external payable nonReentrant {
        ILicenseFactory licenseFactory = ILicenseFactory(factory);
        ILicenseFactory.License memory fetchedLicense = licenseFactory
            .getLicenseFromId(licenseId);
        uint256 totalFee = fetchedLicense.developerFee +
            fetchedLicense.publisherFee +
            fetchedLicense.platformFee;
        if (fetchedLicense.isActive == false) {
            revert licenseNotActive(licenseId);
        }
        if (msg.value != totalFee) {
            revert NotSufficientETH(msg.value, totalFee);
        }

        address licenseAddress = fetchedLicense.contractAddress;

        ILicenseContract licenseContract = ILicenseContract(licenseAddress);
        uint256 nftId = _tokenIdCounter;
        _tokenIdCounter++;

        gameNfts[nftId] = GameNft({
            owner: _receiver,
            uri: uri,
            licenseId: licenseId,
            licenseAddress: licenseAddress,
            listedForSale: false
        });
        allNftIds.push(nftId);

        licenseContract.safeMint(uri, _receiver, nftId);

        bool success;

        if (fetchedLicense.developerFee > 0) {
            (success, ) = payable(fetchedLicense.developer).call{
                value: fetchedLicense.developerFee
            }("");
            if (!success) {
                revert TransferFailed(
                    msg.sender,
                    fetchedLicense.developer,
                    fetchedLicense.developerFee
                );
            }
        }

        if (fetchedLicense.publisherFee > 0) {
            (success, ) = payable(fetchedLicense.publisher).call{
                value: fetchedLicense.publisherFee
            }("");
            if (!success) {
                revert TransferFailed(
                    msg.sender,
                    fetchedLicense.publisher,
                    fetchedLicense.publisherFee
                );
            }
        }

        if (fetchedLicense.platformFee > 0) {
            (success, ) = payable(fetchedLicense.platform).call{
                value: fetchedLicense.platformFee
            }("");
            if (!success) {
                revert TransferFailed(
                    msg.sender,
                    fetchedLicense.platform,
                    fetchedLicense.platformFee
                );
            }
        }

        emit Mint(_receiver, licenseAddress, uri, block.timestamp);
    }

    function getAllNftIds() external view returns (uint256[] memory) {
        return allNftIds;
    }

    function getNftDetails(
        uint256 nftId
    ) external view returns (GameNft memory) {
        return gameNfts[nftId];
    }

    function changeNftStatus(
        uint256 nftId,
        bool status
    ) external isAuthorizedForSecondary {
        gameNfts[nftId].listedForSale = status;
        emit NFTStatusChange(msg.sender, status, nftId, block.timestamp);
    }

    function updateNftData(
        uint256 nftId,
        GameNft memory nftData
    ) external isAuthorizedForSecondary {
        gameNfts[nftId] = nftData;
        emit NFTDataUpdate(
            msg.sender,
            nftData.owner,
            nftData.licenseAddress,
            nftData.uri,
            block.timestamp
        );
    }

    function setSecondaryMarketPlace(address _secondary) external {
        if (msg.sender != owner() && msg.sender != ADMINISTRATOR) {
            revert onlyAdmin(msg.sender);
        }
        secondaryMarketPlace = _secondary;
    }
}
