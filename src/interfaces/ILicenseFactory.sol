// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {License, LicenseInput} from "../types/Types.sol";

/// @author Vector Blockchain AG
/// @title ILicenseFactory
/// @notice Interface for the LicenseFactory contract that deploys and manages license contracts.
interface ILicenseFactory {
    /**
     * @notice Emitted when a new license contract is deployed.
     * @param contractAddress The address of the newly deployed license contract.
     * @param tokenId The token ID of the license.
     * @param creator The creator of the license contract.
     * @param timestamp The timestamp when the contract was deployed.
     */
    event NewLicenseContract(
        address indexed contractAddress,
        uint256 tokenId,
        address indexed creator,
        uint256 timestamp
    );

    /**
     * @notice Emitted when mutable license data (metadata / parties / fee split) is updated.
     * @param contractAddress The address of the underlying license contract.
     * @param licenseId The license token ID whose data was updated.
     * @param oldTotalFee The previous total fee (sum of developer, platform, publisher fees).
     * @param newTotalFee The new total fee after update.
     * @param updatedBy The address that initiated the update.
     * @param timestamp The block timestamp when the update occurred.
     */
    event ChangeLicenseDetails(
        address indexed contractAddress,
        uint256 indexed licenseId,
        uint256 oldTotalFee,
        uint256 newTotalFee,
        address indexed updatedBy,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a license's active status is changed.
     * @param licenseId The license token ID whose status was changed.
     * @param isActive The new active status.
     * @param changedBy The address that initiated the status change.
     * @param timestamp The block timestamp when the status was changed.
     */
    event LicenseStatusChanged(
        uint256 indexed licenseId,
        bool isActive,
        address indexed changedBy,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a license's metadata URI is updated.
     * @param licenseId The license token ID whose URI was updated.
     * @param newUri The new metadata URI.
     * @param updatedBy The address that initiated the URI update.
     * @param timestamp The block timestamp when the URI was updated.
     */
    event LicenseURIUpdated(
        uint256 indexed licenseId,
        string newUri,
        address indexed updatedBy,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a coordinator is added or removed.
     * @param coordinator The address of the coordinator added or removed.
     * @param status True if added, false if removed.
     * @param timestamp The timestamp when the coordinator status was changed.
     */
    event CoordinatorStatusChanged(
        address indexed coordinator,
        bool status,
        uint256 timestamp
    );

    /// @notice Deploy a new license contract and store its metadata.
    /// @param licenseInput The configuration and metadata for the license.
    /// @return The address of the newly deployed license contract.
    function createLicense(
        LicenseInput memory licenseInput
    ) external returns (address);

    /// @notice Change the active status of an existing license.
    /// @param licenseId The license ID (token ID).
    /// @param status The new active status (true or false).
    function changeLicenseStatus(uint256 licenseId, bool status) external;

    /// @notice Update the metadata URI of a license token in the associated license contract.
    /// @param licenseId The license token ID.
    /// @param uri The new metadata URI to set.
    function updateLicense(uint256 licenseId, string memory uri) external;

    /// @notice Add or remove coordinator status for a given address.
    /// @param _coordinator The address to add or remove.
    /// @param status True to add, false to remove.
    function setCoordinator(address _coordinator, bool status) external;

    /// @notice Get full license metadata by ID.
    /// @param id The license ID (token ID).
    /// @return A `License` struct with metadata and configuration.
    function getLicenseFromId(
        uint256 id
    ) external view returns (License memory);

    /// @notice Get the owner of a license.
    /// @param id The license ID (token ID).
    /// @return The address of the license owner.
    function getOwnerOfLicense(uint256 id) external view returns (address);

    /// @notice Get the coordinator for a license.
    /// @param id The license ID (token ID).
    /// @return The address of the coordinator.
    function getCoordinator(uint256 id) external view returns (address);

    /// @notice Return all license IDs ever created.
    /// @return An array of uint256 license IDs.
    function getAllLicenseIds() external view returns (uint256[] memory);

    /// @notice Return the current owner of the LicenseFactory contract.
    /// @return The owner address.
    function owner() external view returns (address);
}
