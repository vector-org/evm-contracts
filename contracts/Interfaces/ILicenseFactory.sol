// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ILicenseFactory
/// @notice Interface for the LicenseFactory contract that creates and manages LicenseContract instances.
interface ILicenseFactory {
    /// @notice Struct representing a deployed license contract.
    struct License {
        address contractAddress;
        address owner;
        address coordinator;
        string name;
        string symbol;
        uint256 licenseId;
        bool isActive;
        uint256 timestamp;
    }

    /// @notice Emitted when a new license contract is deployed.
    event NewLicenseContract(
        address indexed contractAddress,
        uint256 tokenId,
        address indexed creator,
        uint256 timestamp
    );

    /// @notice Emitted when the factory owner is changed.
    event OwnerChanged(
        address indexed newOwner,
        address indexed oldOwner,
        uint256 timestamp
    );

    /// @notice Emitted when a new coordinator is added.
    event AddCoordinator(
        address indexed coordinator,
        uint256 timestamp
    );

    /// @notice Deploys a new LicenseContract.
    /// @param name The ERC-721 name for the license collection.
    /// @param symbol The ERC-721 symbol.
    /// @param isActive Boolean flag indicating whether the license is currently active.
    /// @return The address of the newly deployed LicenseContract.
    function createLicense(
        string memory name,
        string memory symbol,
        bool isActive
    ) external returns (address);

    /// @notice Changes the `isActive` status of a deployed license.
    /// @param licenseId The ID of the license to update.
    /// @param status The new active status (true or false).
    function changeLicenseStatus(uint256 licenseId, bool status) external;

    /// @notice Transfers ownership of the factory.
    /// @param newOwner The new owner address.
    function setOwner(address newOwner) external;

    /// @notice Adds or removes a coordinator.
    /// @param _coordinator The address to update.
    /// @param status True to add as coordinator, false to revoke.
    function setCoordinator(address _coordinator, bool status) external;

    /// @notice Gets the License metadata for a given ID.
    /// @param id The license ID.
    /// @return A License struct with metadata.
    function getLicenseFromID(uint256 id) external view returns (License memory);

    /// @notice Gets the owner address of a license by ID.
    /// @param id The license ID.
    /// @return The owner address.
    function getOwnerOfLicense(uint256 id) external view returns (address);

    /// @notice Gets the coordinator address for a license.
    /// @param id The license ID.
    /// @return The coordinator address.
    function getCoordinator(uint256 id) external view returns (address);

    /// @notice Returns all license IDs created by the factory.
    /// @return An array of license IDs.
    function getAllLicenseIds() external view returns (uint256[] memory);
}
