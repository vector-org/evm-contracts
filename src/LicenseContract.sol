// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Addresses} from "./constants/Addresses.sol";
import {IERC5192} from "./interfaces/IERC5192.sol";
import {
    notFactory,
    notOwnerOrFactory,
    notPrimaryOrSecondary,
    notPrimaryMarketPlace,
    TokenLocked
} from "./errors/LicenseContract.sol";
import {ZeroAddressInput} from "./errors/Common.sol";

/**
 * @author Vector Blockchain AG
 * @title LicenseContract
 * @notice ERC721 contract for representing game licenses as NFTs.
 * @dev This contract is deployed and managed by the LicenseFactory. Minting and transfer logic is tightly controlled and only allowed for trusted marketplace contracts.
 *
 * @custom:usage
 * - The LicenseFactory deploys this contract for each new license.
 * - Only the PrimaryMarketPlace contract can mint new NFTs via `safeMint`.
 * - Only the PrimaryMarketPlace and SecondaryMarketPlace contracts can transfer NFTs (enforced in `_update`).
 * - The LicenseFactory, contract owner, or administrator can update token URIs.
 * - Supports ERC-5192 for soulbound (non-transferable) tokens.
 */
contract LicenseContract is ERC721, ERC721URIStorage, Addresses, IERC5192 {
    /// @notice The owner of this LicenseContract instance.
    address public owner;
    /// @notice The LicenseFactory address that deployed this contract.
    address public immutable FACTORY;
    /// @notice The PrimaryMarketPlace contract address allowed to mint and transfer.
    address public immutable PRIMARYMARKETPLACE;
    /// @notice The SecondaryMarketPlace contract address allowed to transfer.
    address public immutable SECONDARYMARKETPLACE;

    /// @notice Mapping of token ID to locked (soulbound) status
    mapping(uint256 => bool) private _locked;

    /// @notice Restricts function to only the factory.
    /// @param _factory The factory address to check.
    modifier onlyFactory(address _factory) {
        if (msg.sender != _factory) {
            revert notFactory(msg.sender);
        }
        _;
    }

    /// @notice Restricts function to only the PrimaryMarketPlace.
    modifier onlyPrimaryMarketPlace() {
        if (msg.sender != PRIMARYMARKETPLACE) {
            revert notPrimaryMarketPlace();
        }
        _;
    }

    /**
     * @notice Deploys a new LicenseContract.
     * @param name The ERC721 name.
     * @param symbol The ERC721 symbol.
     * @param _factory The LicenseFactory address.
     * @param primaryMarketplace The PrimaryMarketPlace address.
     * @param secondaryMarketplace The SecondaryMarketPlace address.
     * @dev Only the factory can deploy. All addresses must be nonzero.
     */
    constructor(
        string memory name,
        string memory symbol,
        address _factory,
        address primaryMarketplace,
        address secondaryMarketplace
    ) ERC721(name, symbol) onlyFactory(_factory) Addresses(msg.sender) {
        if (
            _factory == ZERO_ADDRESS ||
            primaryMarketplace == ZERO_ADDRESS ||
            secondaryMarketplace == ZERO_ADDRESS
        ) {
            revert ZeroAddressInput();
        }
        FACTORY = _factory;
        owner = msg.sender;
        PRIMARYMARKETPLACE = primaryMarketplace;
        SECONDARYMARKETPLACE = secondaryMarketplace;
    }

    /**
     * @notice Mint a new license NFT to a user.
     * @dev Only callable by the PrimaryMarketPlace contract.
     * @param uri The metadata URI for the NFT.
     * @param to The address to receive the NFT.
     * @param licenseId The tokenId for the NFT.
     * @custom:called-by PrimaryMarketPlace when a user purchases/mints a license.
     */
    function safeMint(
        string memory uri,
        address to,
        uint256 licenseId
    ) public onlyPrimaryMarketPlace {
        _safeMint(to, licenseId);
        _setTokenURI(licenseId, uri);
    }

    /**
     * @notice Mint a new soulbound (non-transferable) license NFT.
     * @dev Only callable by PrimaryMarketPlace. Token is permanently locked.
     * @param uri The metadata URI for the NFT.
     * @param to The address to receive the NFT.
     * @param licenseId The tokenId for the NFT.
     * @custom:called-by PrimaryMarketPlace for Steam Legacy mints.
     */
    function safeMintLocked(
        string memory uri,
        address to,
        uint256 licenseId
    ) public onlyPrimaryMarketPlace {
        _safeMint(to, licenseId);
        _setTokenURI(licenseId, uri);
        _locked[licenseId] = true;
        emit Locked(licenseId);
    }

    /**
     * @notice Check if a token is locked (soulbound).
     * @param tokenId The tokenId to check.
     * @return True if the token is locked and non-transferable.
     */
    function locked(uint256 tokenId) external view returns (bool) {
        return _locked[tokenId];
    }

    /**
     * @notice Get the metadata URI for a license NFT.
     * @param licenseId The tokenId of the NFT.
     * @return The metadata URI.
     */
    function tokenURI(
        uint256 licenseId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(licenseId);
    }

    /**
     * @notice Update the metadata URI for a license NFT.
     * @dev Only the contract owner, factory, or administrator can update.
     * @param licenseId The tokenId of the NFT.
     * @param newUri The new metadata URI.
     * @custom:called-by LicenseFactory, contract owner, or administrator for metadata updates.
     */
    function updateTokenURI(uint256 licenseId, string memory newUri) public {
        if (
            msg.sender != owner &&
            msg.sender != FACTORY &&
            msg.sender != Addresses.ADMINISTRATOR
        ) {
            revert notOwnerOrFactory(msg.sender);
        }
        _setTokenURI(licenseId, newUri);
    }

    /**
     * @notice Internal transfer logic override for NFT transfers and burns.
     * @dev Only PrimaryMarketPlace and SecondaryMarketPlace can transfer NFTs. Clears token URI on burn.
     * @param to The recipient address.
     * @param tokenId The tokenId being transferred.
     * @param auth The address initiating the transfer.
     * @return The previous owner address.
     * @custom:called-by PrimaryMarketPlace and SecondaryMarketPlace for transfers.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Block transfers of locked (soulbound) tokens - allow minting (from == 0)
        if (_locked[tokenId] && from != address(0)) {
            revert TokenLocked(tokenId);
        }

        if (
            from != address(0) &&
            auth != PRIMARYMARKETPLACE &&
            auth != SECONDARYMARKETPLACE
        ) {
            revert notPrimaryOrSecondary(auth);
        }

        if (to == address(0)) {
            _setTokenURI(tokenId, "");
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Check if this contract supports an interface.
     * @param interfaceId The interface identifier.
     * @return True if supported.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        // ERC-5192 interface ID: 0xb45a3c0e
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }
}
