// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {ILicenseContract} from "./interfaces/ILicenseContract.sol";
import {ILicenseFactory} from "./interfaces/ILicenseFactory.sol";
import {License} from "./types/Types.sol";
import {Addresses} from "./constants/Addresses.sol";
import {GameNft} from "./types/Types.sol";
import {
    onlyAdmin,
    TransferFailed,
    UnAuthorizedUser,
    ZeroAddressInput
} from "./errors/Common.sol";
import {
    licenseNotActive,
    NotSufficientETH,
    nftIdNotFound
} from "./errors/PrimaryMarketPlace.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IPrimaryMarketPlace} from "./interfaces/IPrimaryMarketPlace.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @author Vector Blockchain AG
 * @title PrimaryMarketPlace
 * @notice Marketplace contract for minting and managing game license NFTs.
 * @dev Handles minting, user NFT tracking, and fee distribution. Integrates with LicenseFactory and LicenseContract. Only authorized addresses can update or transfer NFTs.
 *
 * @custom:usage
 * - Users mint new license NFTs via `mintLicense`.
 * - Only authorized addresses (admin, coordinator, secondary marketplace) can update or transfer NFTs.
 * - Integrates with upgradeable proxy pattern (UUPS).
 */
contract PrimaryMarketPlace is
    Addresses,
    ReentrancyGuard,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    IPrimaryMarketPlace
{
    address private immutable PRIMARY_MARKETPLACE = address(this);
    address private coordinator;
    address private factory;
    address private secondaryMarketPlace;
    /// @notice Mapping from NFT ID to its GameNft metadata.
    mapping(uint256 => GameNft) public gameNfts;
    /// @notice List of all NFT IDs managed by the marketplace.
    uint256[] public allNftIds;

    uint256 private _tokenIdCounter;
    mapping(address => uint256[]) private userNftIds;

    uint256[46] private __storageGap;

    /// @notice Restricts function to only the administrator.
    modifier checkIsAdmin() {
        if (msg.sender != Addresses.ADMINISTRATOR) {
            revert onlyAdmin(msg.sender);
        }
        _;
    }

    /// @notice Restricts function to coordinator, admin, or secondary marketplace.
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

    /// @notice Restricts function to only the owner or administrator.
    modifier onlyOwnerOrAdmin() {
        if (msg.sender != ADMINISTRATOR && msg.sender != owner()) {
            revert UnAuthorizedUser(msg.sender);
        }
        _;
    }

    /**
     * @notice Constructs the PrimaryMarketPlace contract.
     * @dev Disables initializers to prevent proxy misuse.
     */
    constructor() Addresses(msg.sender) checkIsAdmin() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the PrimaryMarketPlace contract.
     * @param _admin The administrator address.
     * @param _coordinator The coordinator address.
     * @param _factory The LicenseFactory address.
     * @dev Can only be called once. Sets up ownership, UUPS, and pausable modules.
     */
    function initialize(
        address _admin,
        address _coordinator,
        address _factory
    ) public initializer {
        if (
            _admin == ZERO_ADDRESS ||
            _coordinator == ZERO_ADDRESS ||
            _factory == ZERO_ADDRESS
        ) {
            revert ZeroAddressInput();
        }
        if (_admin != ADMINISTRATOR) {
            revert onlyAdmin(_admin);
        }

        __Ownable_init(_admin);
        __UUPSUpgradeable_init();
        __Pausable_init();

        coordinator = _coordinator;
        factory = _factory;
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
     * @notice Mint a new license NFT for a user.
     * @param licenseId The license ID to mint from.
     * @param _receiver The address to receive the NFT.
     * @param uri The metadata URI for the NFT.
     * @dev Requires payment of all license fees. Only active licenses can be minted. Emits Mint event.
     */
    function mintLicense(
        uint256 licenseId,
        address _receiver,
        string memory uri
    ) external payable whenNotPaused nonReentrant {
        ILicenseFactory licenseFactory = ILicenseFactory(factory);
        License memory fetchedLicense = licenseFactory.getLicenseFromId(
            licenseId
        );
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
        ++_tokenIdCounter;

        gameNfts[nftId] = GameNft({
            owner: _receiver,
            uri: uri,
            licenseId: licenseId,
            licenseAddress: licenseAddress,
            listedForSale: false
        });
        allNftIds.push(nftId);
        userNftIds[_receiver].push(nftId);

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

    /**
     * @notice Add an NFT ID to a user's list (for secondary marketplace integration).
     * @param user The user address.
     * @param nftId The NFT ID to add.
     * @dev Only callable by authorized addresses.
     */
    function addToUserLicenseNftIds(
        address user,
        uint256 nftId
    ) external whenNotPaused isAuthorizedForSecondary {
        uint256[] storage nftList = userNftIds[user];
        nftList.push(nftId);
    }

    /**
     * @notice Get all NFT IDs managed by the marketplace.
     * @return Array of NFT IDs.
     */
    function getAllNftIds() external view returns (uint256[] memory) {
        return allNftIds;
    }

    /**
     * @notice Get details for a specific NFT.
     * @param nftId The NFT ID.
     * @return The GameNft struct.
     */
    function getNftDetails(
        uint256 nftId
    ) external view returns (GameNft memory) {
        return gameNfts[nftId];
    }

    /**
     * @notice Get all NFT IDs owned by a user.
     * @param user The user address.
     * @return Array of NFT IDs.
     */
    function getUserNftIds(
        address user
    ) external view returns (uint256[] memory) {
        return userNftIds[user];
    }

    /**
     * @notice Change the listed-for-sale status of an NFT.
     * @param nftId The NFT ID.
     * @param status The new listed status.
     * @dev Only callable by authorized addresses. Emits NFTStatusChange event.
     */
    function changeNftStatus(
        uint256 nftId,
        bool status
    ) external whenNotPaused isAuthorizedForSecondary {
        gameNfts[nftId].listedForSale = status;
        emit NFTStatusChange(msg.sender, status, nftId, block.timestamp);
    }

    /**
     * @notice Remove an NFT ID from a user's list (for secondary marketplace integration).
     * @param user The user address.
     * @param nftId The NFT ID to remove.
     * @dev Only callable by authorized addresses. Reverts if NFT ID not found.
     */
    function removeNftIdsFromUser(
        address user,
        uint256 nftId
    ) external whenNotPaused nonReentrant isAuthorizedForSecondary {
        uint256[] storage newNftList = userNftIds[user];
        uint256 length = newNftList.length;
        bool nftIdFound = false;
        for (uint256 i = 0; i < length; ) {
            if (newNftList[i] == nftId) {
                newNftList[i] = newNftList[length - 1];
                newNftList.pop();
                nftIdFound = true;
                break;
            }
            unchecked {
                ++i;
            }
        }
        if (!nftIdFound) {
            revert nftIdNotFound(nftId);
        }
    }

    /**
     * @notice Update the data for a specific NFT.
     * @param nftId The NFT ID.
     * @param nftData The new GameNft struct data.
     * @dev Only callable by authorized addresses. Emits NFTDataUpdate event.
     */
    function updateNftData(
        uint256 nftId,
        GameNft calldata nftData
    ) external whenNotPaused isAuthorizedForSecondary {
        gameNfts[nftId] = nftData;
        emit NFTDataUpdate(
            msg.sender,
            nftData.owner,
            nftData.licenseAddress,
            nftData.uri,
            block.timestamp
        );
    }

    /**
     * @notice Set the address of the secondary marketplace contract.
     * @param _secondary The secondary marketplace address.
     * @dev Only callable by owner or admin.
     */
    function setSecondaryMarketPlace(
        address _secondary
    ) external whenNotPaused onlyOwnerOrAdmin {
        if (_secondary == ZERO_ADDRESS) {
            revert ZeroAddressInput();
        }
        secondaryMarketPlace = _secondary;
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
}
