// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Interfaces/ILicenseContract.sol";
import "./Interfaces/ILicenseFactory.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PrimaryMarketPlace{
    address private immutable primary_marketplace = address(this);
    address private immutable secondary_marketplace = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address private immutable administrator = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address private immutable owner;
    address private coordinator;
    address private factory;

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    
    event Mint(address indexed to, address indexed licenseAddress, string uri, uint256 timestamp);

    modifier onlyAdmin{
        require(msg.sender == administrator, "You are not the administrator");
        _;
    }

    constructor(
        address _owner,
        address _coordinator,
        address _factory
    ) onlyAdmin{
        owner = _owner;
        coordinator = _coordinator;
        factory = _factory;
    }

    function mintLicense(uint256 licenseId, address _receiver, string memory uri) external {
        ILicenseFactory licenseFactory = ILicenseFactory(factory);
        ILicenseFactory.License memory License = licenseFactory.getLicenseFromID(licenseId);
        require(License.isActive, "License is not active to be minted");
        address licenseAddress = License.contractAddress;

        ILicenseContract licenseContract = ILicenseContract(licenseAddress);
        uint256 nftId = _tokenIdCounter.current();
        licenseContract.safeMint(uri, _receiver, nftId);
        _tokenIdCounter.increment();

        emit Mint(_receiver, licenseAddress, uri, block.timestamp);

    }


}