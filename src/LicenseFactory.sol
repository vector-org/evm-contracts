// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {LicenseContract} from "./LicenseContract.sol";
import {ILicenseFactory} from "./interfaces/ILicenseFactory.sol";
import {ILicenseContract} from "./interfaces/ILicenseContract.sol";
import {Addresses} from "./constants/Addresses.sol";
import {License, LicenseInput} from "./types/Types.sol";
import {
    onlyAdmin,
    onlyCoordinator,
    ZeroAddressInput
} from "./errors/Common.sol";
import {
    notAdminOrOwner,
    licenseNotFound,
    cannotUpdateLicense
} from "./errors/LicenseFactory.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @author Vector Blockchain AG
 * @title LicenseFactory
 * @notice Factory contract for deploying and managing LicenseContract instances representing game licenses as NFTs.
 * @dev Handles creation, status updates, and metadata management for LicenseContracts. Integrates with coordinators and enforces access control for license management.
 *
 * @custom:usage
 * - Deploys new LicenseContract contracts for each license via `createLicense`.
 * - Only coordinators can create new licenses.
 * - License metadata and status can be updated by owners, administrators, or coordinators.
 * - Integrates with upgradeable proxy pattern (UUPS).
 */
contract LicenseFactory is
    Addresses,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ILicenseFactory
{
    /// @notice Mapping from license ID to License struct.
    mapping(uint256 => License) public licenseContracts;
    /// @notice List of all LicenseContract addresses deployed by the factory.
    address[] public allLicenses;
    /// @notice List of all license IDs managed by the factory.
    uint256[] public tokenIds;
    mapping(address => bool) private coordinators;

    uint256 private _tokenIdCounter;

    uint256[47] private __storageGap;

    /// @notice Restricts function to only the administrator.
    modifier checkAccess() {
        if (msg.sender != ADMINISTRATOR) {
            revert onlyAdmin(msg.sender);
        }
        _;
    }

    /// @notice Restricts function to only coordinators.
    modifier checkIsCoordinator() {
        if (coordinators[msg.sender] == false) {
            revert onlyCoordinator(msg.sender);
        }
        _;
    }

    /**
     * @notice Constructs the LicenseFactory contract.
     * @dev Disables initializers to prevent proxy misuse.
     */
    constructor() Addresses(msg.sender) checkAccess {
        _disableInitializers();
    }

    /**
     * @notice Initializes the LicenseFactory contract.
     * @param _admin The administrator address.
     * @dev Can only be called once. Sets up ownership, UUPS, and pausable modules. Adds admin as coordinator.
     */
    function initialize(address _admin) public initializer {
        if (_admin == ZERO_ADDRESS) {
            revert ZeroAddressInput();
        }
        if (_admin != ADMINISTRATOR) {
            revert onlyAdmin(_admin);
        }

        __Ownable_init(_admin);
        __UUPSUpgradeable_init();
        __Pausable_init();

        coordinators[_admin] = true;
    }

    /* solhint-disable no-empty-blocks */
    /**
     * @notice Authorizes contract upgrades.
     * @param newImplementation The address of the new implementation.
     * @dev Only callable by the contract owner (UUPS pattern).
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
    /* solhint-enable no-empty-blocks */

    /**
     * @notice Deploys a new LicenseContract for a game license.
     * @param licenseInput The license metadata and configuration.
     * @return The address of the new LicenseContract.
     * @dev Only callable by coordinators. Emits NewLicenseContract event.
     */
    function createLicense(
        LicenseInput memory licenseInput
    ) external whenNotPaused checkIsCoordinator returns (address) {
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

        (
            uint256 platformFee,
            uint256 publisherFee,
            uint256 devFee
        ) = _splitFees(licenseInput.totalFee);

        _storeNewLicense(
            _tokenIdCounter,
            newLicenseAddress,
            msg.sender,
            licenseInput,
            devFee,
            platformFee,
            publisherFee
        );

        emit NewLicenseContract(
            newLicenseAddress,
            _tokenIdCounter,
            msg.sender,
            block.timestamp
        );
        ++_tokenIdCounter;
        return newLicenseAddress;
    }

    /**
     * @notice Change the active status of a license.
     * @param licenseId The license ID.
     * @param status The new active status.
     * @dev Only the license owner or administrator can change status.
     */
    function changeLicenseStatus(
        uint256 licenseId,
        bool status
    ) external whenNotPaused {
        address licenseOwner = licenseContracts[licenseId].owner;
        if (
            licenseOwner != msg.sender && msg.sender != Addresses.ADMINISTRATOR
        ) {
            revert notAdminOrOwner(msg.sender);
        }
        licenseContracts[licenseId].isActive = status;
    }

    /**
     * @notice Update mutable license data (metadata, parties and fee split) for an existing license.
     * @param licenseId The license ID to modify.
     * @param licenseInput New license input values (totalFee will be repartitioned into fees).
     * @dev Only coordinators can call. Recomputes platform / publisher / developer fees from totalFee.
     *      Preserves original owner, coordinator and contractAddress.
     *      Reverts if license does not exist.
     */
    function changeLicenseData(
        uint256 licenseId,
        LicenseInput calldata licenseInput
    ) external whenNotPaused checkIsCoordinator {
        License storage licenseSlot = licenseContracts[licenseId];
        if (licenseSlot.contractAddress == ZERO_ADDRESS) {
            revert licenseNotFound(licenseId);
        }
        (
            uint256 platformFee,
            uint256 publisherFee,
            uint256 devFee
        ) = _splitFees(licenseInput.totalFee);
        _storeNewLicense(
            licenseId,
            licenseSlot.contractAddress,
            licenseSlot.owner,
            licenseInput,
            devFee,
            platformFee,
            publisherFee
        );

        emit ChangeLicenseDetails(
            licenseSlot.contractAddress,
            licenseId,
            block.timestamp
        );
    }

    /**
     * @notice Update the metadata URI for a license.
     * @param licenseId The license ID.
     * @param uri The new metadata URI.
     * @dev Only the license owner, administrator, or coordinator can update.
     */
    function updateLicense(
        uint256 licenseId,
        string calldata uri
    ) external whenNotPaused {
        address licenseAddress = licenseContracts[licenseId].contractAddress;
        if (licenseAddress == address(0)) {
            revert licenseNotFound(licenseId);
        }
        if (
            msg.sender != licenseContracts[licenseId].owner &&
            msg.sender != Addresses.ADMINISTRATOR &&
            coordinators[msg.sender] != true
        ) {
            revert cannotUpdateLicense(msg.sender);
        }
        ILicenseContract licenseContract = ILicenseContract(licenseAddress);
        licenseContract.updateTokenURI(licenseId, uri);
    }

    /**
     * @notice Split a total license fee into platform, publisher and developer portions.
     * @param totalFees The aggregate fee amount.
     * @return platformFee Portion assigned to the platform.
     * @return publisherFee Portion assigned to the publisher.
     * @return devFee Remaining portion assigned to the developer.
     */
    function _splitFees(
        uint256 totalFees
    )
        internal
        pure
        returns (uint256 platformFee, uint256 publisherFee, uint256 devFee)
    {
        platformFee = (totalFees * PLATFORM_FEE) / 100;
        publisherFee = (totalFees * PUBLISHER_FEE) / 100;
        devFee = totalFees - platformFee - publisherFee;
    }

    /**
     * @notice Set or unset a coordinator address.
     * @param _coordinator The coordinator address.
     * @param status True to add, false to remove.
     * @dev Only callable by the contract owner. Emits AddCoordinator event.
     */
    function setCoordinator(
        address _coordinator,
        bool status
    ) external whenNotPaused onlyOwner {
        coordinators[_coordinator] = status;
        emit AddCoordinator(_coordinator, block.timestamp);
    }

    /**
     * @notice Persist a newly created (or refreshed) license record in storage.
     * @param id License ID (token ID).
     * @param licenseAddr Deployed LicenseContract address.
     * @param creator Address set as license owner.
     * @param licenseInput Source input (metadata + parties).
     * @param devFee Developer fee portion (post‑split).
     * @param platformFee Platform fee portion (post‑split).
     * @param publisherFee Publisher fee portion (post‑split).
     * @dev Sets coordinator to ADMINISTRATOR and stamps current block timestamp.
     */
    function _storeNewLicense(
        uint256 id,
        address licenseAddr,
        address creator,
        LicenseInput memory licenseInput,
        uint256 devFee,
        uint256 platformFee,
        uint256 publisherFee
    ) internal whenNotPaused {
        License storage licenseSlot = licenseContracts[id];
        licenseSlot.contractAddress = licenseAddr;
        licenseSlot.owner = creator;
        licenseSlot.coordinator = ADMINISTRATOR;
        licenseSlot.name = licenseInput.name;
        licenseSlot.symbol = licenseInput.symbol;
        licenseSlot.uri = licenseInput.uri;
        licenseSlot.isActive = licenseInput.isActive;
        licenseSlot.timestamp = block.timestamp;
        licenseSlot.developerFee = devFee;
        licenseSlot.platformFee = platformFee;
        licenseSlot.publisherFee = publisherFee;
        licenseSlot.developer = licenseInput.developer;
        licenseSlot.publisher = licenseInput.publisher;
        licenseSlot.platform = licenseInput.platform;
    }

    /**
     * @notice Get license metadata from its ID.
     * @param id The license ID.
     * @return The License struct.
     */
    function getLicenseFromId(
        uint256 id
    ) external view returns (License memory) {
        return licenseContracts[id];
    }

    /**
     * @notice Get the owner address of a license.
     * @param id The license ID.
     * @return The owner address.
     */
    function getOwnerOfLicense(uint256 id) external view returns (address) {
        return licenseContracts[id].owner;
    }

    /**
     * @notice Get the coordinator address of a license.
     * @param id The license ID.
     * @return The coordinator address.
     */
    function getCoordinator(uint256 id) external view returns (address) {
        return licenseContracts[id].coordinator;
    }

    /**
     * @notice Get all license IDs managed by the factory.
     * @return Array of license IDs.
     */
    function getAllLicenseIds() external view returns (uint256[] memory) {
        return tokenIds;
    }

    /**
     * @notice Pause the contract (emergency stop).
     * @dev Only callable by the contract owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract.
     * @dev Only callable by the contract owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Returns the current owner of the factory.
     * @dev Explicit override to resolve multiple inheritance (OwnableUpgradeable + ILicenseFactory).
     *      Uses the underlying OwnableUpgradeable implementation via `super.owner()`.
     * @return ownerAddress Address that currently has ownership privileges (can pause, upgrade, set coordinators, etc.).
     */
    function owner()
        public
        view
        override(OwnableUpgradeable, ILicenseFactory)
        returns (address ownerAddress)
    {
        return super.owner();
    }
}
