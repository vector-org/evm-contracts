// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ILicenseContract} from "./interfaces/ILicenseContract.sol";
import {ILicenseFactory} from "./interfaces/ILicenseFactory.sol";
import {Counters} from "./utils/Counters.sol";
import {Addresses} from "./constants/Addresses.sol";
import {GameNFT} from "./types/Types.sol";
import {
    onlyAdmin,
    onlyOwner,
    TransferFailed,
    UnAuthorizedUser,
    FunctionDoesntExist
} from "./errors/Common.sol";
import {
    licenseNotActive,
    NotSufficientETH,
    ETHTransfersNotAllowed
} from "./errors/PrimaryMarketPlace.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

contract PrimaryMarketPlace is Addresses, ReentrancyGuard {
    address private immutable primaryMarketplace = address(this);
    address public owner;
    address private coordinator;
    address private factory;
    mapping(uint256 => GameNFT) public gameNFTs;
    uint256[] public allNFTIDs;

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

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

    modifier checkIsAuthorized() {
        if (
            msg.sender != Addresses.ADMINISTRATOR && msg.sender != coordinator
        ) {
            revert UnAuthorizedUser(msg.sender);
        }
        _;
    }

    modifier checkIsOwner() {
        if (msg.sender != owner) {
            revert onlyOwner(msg.sender);
        }
        _;
    }

    constructor(
        address _owner,
        address _coordinator,
        address _factory
    ) Addresses(msg.sender) checkIsAdmin() {
        owner = _owner;
        coordinator = _coordinator;
        factory = _factory;
    }

    function mintLicense(
        uint256 licenseId,
        address _receiver,
        string memory uri
    ) external payable nonReentrant {
        ILicenseFactory licenseFactory = ILicenseFactory(factory);
        ILicenseFactory.License memory License = licenseFactory
            .getLicenseFromID(licenseId);
        if (License.isActive == false) {
            revert licenseNotActive(licenseId);
        }
        if (
            msg.value !=
            License.developerFee + License.publisherFee + License.platformFee
        ) {
            revert NotSufficientETH(
                msg.value,
                License.developerFee +
                    License.publisherFee +
                    License.platformFee
            );
        }

        address licenseAddress = License.contractAddress;

        ILicenseContract licenseContract = ILicenseContract(licenseAddress);
        uint256 nftId = _tokenIdCounter.current();
        licenseContract.safeMint(uri, _receiver, nftId);
        _tokenIdCounter.increment();

        gameNFTs[nftId] = GameNFT({
            owner: _receiver,
            uri: uri,
            licenseId: licenseId,
            licenseAddress: licenseAddress,
            listedForSale: false
        });
        allNFTIDs.push(nftId);

        bool success;

        if (License.developerFee > 0) {
            (success, ) = payable(License.developer).call{
                value: License.developerFee
            }("");
            if (!success) {
                revert TransferFailed(
                    msg.sender,
                    License.developer,
                    License.developerFee
                );
            }
        }

        if (License.publisherFee > 0) {
            (success, ) = payable(License.publisher).call{
                value: License.publisherFee
            }("");
            if (!success) {
                revert TransferFailed(
                    msg.sender,
                    License.publisher,
                    License.publisherFee
                );
            }
        }

        if (License.platformFee > 0) {
            (success, ) = payable(License.platform).call{
                value: License.platformFee
            }("");
            if (!success) {
                revert TransferFailed(
                    msg.sender,
                    License.platform,
                    License.platformFee
                );
            }
        }

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
        if (msg.sender != gameNFTs[nftId].owner) {
            revert UnAuthorizedUser(msg.sender);
        }
        gameNFTs[nftId].listedForSale = status;
        emit NFTStatusChange(msg.sender, status, nftId, block.timestamp);
    }

    function updateNFTData(
        uint256 nftId,
        GameNFT memory nftData
    ) external checkIsAuthorized {
        gameNFTs[nftId] = nftData;
        emit NFTDataUpdate(
            msg.sender,
            nftData.owner,
            nftData.licenseAddress,
            nftData.uri,
            block.timestamp
        );
    }

    receive() external payable {
        revert ETHTransfersNotAllowed();
    }

    fallback() external payable {
        revert FunctionDoesntExist();
    }
}
