// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ILicenseFactory
/// @notice Interface for the LicenseFactory contract that deploys and manages license contracts.
interface ILicenseFactory {
    /// @dev License metadata stored on factory creation.
    struct License {
        address contractAddress;
        address owner;
        address coordinator;
        string name;
        string symbol;
        bool isActive;
        uint256 timestamp;
        uint256 developerFee;
        uint256 platformFee;
        uint256 publisherFee;
        address developer;
        address publisher;
        address platform;
    }

    /// @dev Input struct passed to `createLicense()`.
    struct LicenseInput {
        string name;
        string symbol;
        bool isActive;
        uint256 developerFee;
        uint256 platformFee;
        uint256 publisherFee;
        address developer;
        address publisher;
        address platform;
    }

    /// @notice Emitted when a new license contract is deployed.
    event NewLicenseContract(
        address indexed contractAddress,
        uint256 tokenId,
        address indexed creator,
        uint256 timestamp
    );

    /// @notice Emitted when the owner is changed.
    event OwnerChanged(
        address indexed newOwner,
        address indexed oldOwner,
        uint256 timestamp
    );

    /// @notice Emitted when a coordinator is added or removed.
    event AddCoordinator(
        address indexed coordinator,
        uint256 timestamp
    );

    /// @notice Deploy a new license contract and store its metadata.
    /// @param licenseInput The configuration and metadata for the license.
    /// @return The address of the newly deployed license contract.
    function createLicense(LicenseInput memory licenseInput) external returns (address);

    /// @notice Change the active status of an existing license.
    /// @param licenseId The license ID (token ID).
    /// @param status The new active status (true or false).
    function changeLicenseStatus(uint256 licenseId, bool status) external;

    /// @notice Transfer ownership of the factory contract to a new address.
    /// @param newOwner The new owner of the contract.
    function setOwner(address newOwner) external;

    /// @notice Add or remove coordinator status for a given address.
    /// @param _coordinator The address to add or remove.
    /// @param status True to add, false to remove.
    function setCoordinator(address _coordinator, bool status) external;

    /// @notice Get full license metadata by ID.
    /// @param id The license ID (token ID).
    /// @return A `License` struct with metadata and configuration.
    function getLicenseFromID(uint256 id) external view returns (License memory);

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
