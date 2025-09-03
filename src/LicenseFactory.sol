// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {LicenseContract} from "./LicenseContract.sol";
import {ILicenseContract} from "./interfaces/ILicenseContract.sol";
import {Addresses} from "./constants/Addresses.sol";
import {License, LicenseInput} from "./types/Types.sol";
import {onlyAdmin, onlyCoordinator, onlyOwner} from "./errors/Common.sol";
import {
    notAdminOrOwner,
    licenseNotFound,
    cannotUpdateLicense
} from "./errors/LicenseFactory.sol";

contract LicenseFactory is
    Addresses,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    mapping(uint256 => License) public licenseContracts;
    address[] public allLicenses;
    uint256[] public tokenIds;
    mapping(address => bool) private coordinators;

    uint256 private _tokenIdCounter;

    uint256[47] private __storage_gap;

    event NewLicenseContract(
        address indexed contractAddress,
        uint256 tokenId,
        address indexed creator,
        uint256 timestamp
    );
    event OwnerChanged(
        address indexed newOwner,
        address indexed oldOwner,
        uint256 timestamp
    );
    event AddCoordinator(address indexed coordinator, uint256 timestamp);

    modifier checkAccess() {
        if (msg.sender != ADMINISTRATOR) {
            revert onlyAdmin(msg.sender);
        }
        _;
    }

    modifier checkIsCoordinator() {
        if (coordinators[msg.sender] == false) {
            revert onlyCoordinator(msg.sender);
        }
        _;
    }

    constructor() Addresses(msg.sender) checkAccess {
        _disableInitializers();
    }

    function initialize(address _admin) public initializer {
        __Ownable_init(_admin);
        __UUPSUpgradeable_init();

        if (_admin != ADMINISTRATOR) {
            revert onlyAdmin(_admin);
        }

        coordinators[_admin] = true;
    }

    constructor() Addresses(msg.sender) checkAccess {
        owner = msg.sender;
        coordinators[msg.sender] = true;
    }
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function createLicense(
        LicenseInput memory licenseInput
    ) external checkIsCoordinator returns (address) {
        address newLicenseAddress = address(
            new LicenseContract(
                licenseInput.name,
                licenseInput.symbol,
                address(this),
                licenseInput.primaryMarketplace,
                licenseInput.secondaryMarketplace
            )
        );
        allLicenses.push(newLicenseAddress);

        tokenIds.push(_tokenIdCounter);

        License storage licenseSlot = licenseContracts[_tokenIdCounter];
        licenseSlot.contractAddress = newLicenseAddress;
        licenseSlot.owner = msg.sender;
        licenseSlot.coordinator = Addresses.ADMINISTRATOR;
        licenseSlot.name = licenseInput.name;
        licenseSlot.symbol = licenseInput.symbol;
        licenseSlot.uri = licenseInput.uri;
        licenseSlot.isActive = licenseInput.isActive;
        licenseSlot.timestamp = block.timestamp;
        licenseSlot.developerFee = licenseInput.developerFee;
        licenseSlot.platformFee = licenseInput.platformFee;
        licenseSlot.publisherFee = licenseInput.publisherFee;
        licenseSlot.developer = licenseInput.developer;
        licenseSlot.publisher = licenseInput.publisher;
        licenseSlot.platform = licenseInput.platform;

        emit NewLicenseContract(
            newLicenseAddress,
            _tokenIdCounter,
            msg.sender,
            block.timestamp
        );
        _tokenIdCounter++;
        return newLicenseAddress;
    }

    function changeLicenseStatus(uint256 licenseId, bool status) external {
        address license_owner = licenseContracts[licenseId].owner;
        if (
            license_owner != msg.sender && msg.sender != Addresses.ADMINISTRATOR
        ) {
            revert notAdminOrOwner(msg.sender);
        }
        licenseContracts[licenseId].isActive = status;
    }

    function updateLicense(uint256 licenseId, string memory uri) external {
        address license_address = licenseContracts[licenseId].contractAddress;
        if (license_address == address(0)) {
            revert licenseNotFound(licenseId);
        }
        if (
            msg.sender != licenseContracts[licenseId].owner &&
            msg.sender != Addresses.ADMINISTRATOR &&
            coordinators[msg.sender] != true
        ) {
            revert cannotUpdateLicense(msg.sender);
        }
        ILicenseContract licenseContract = ILicenseContract(license_address);
        licenseContract.updateTokenURI(licenseId, uri);
    }

    function setCoordinator(
        address _coordinator,
        bool status
    ) external onlyOwner {
        coordinators[_coordinator] = status;
        emit AddCoordinator(_coordinator, block.timestamp);
    }

    function getLicenseFromID(
        uint256 id
    ) external view returns (License memory) {
        return licenseContracts[id];
    }

    function getOwnerOfLicense(uint256 id) external view returns (address) {
        return licenseContracts[id].owner;
    }

    function getCoordinator(uint256 id) external view returns (address) {
        return licenseContracts[id].coordinator;
    }

    function getAllLicenseIds() external view returns (uint256[] memory) {
        return tokenIds;
    }
}
