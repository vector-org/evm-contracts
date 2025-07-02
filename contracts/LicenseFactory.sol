// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LicenseContract.sol";
import "@openzeppelin/contracts/utils/Counters.sol"; 

contract LicenseFactory{
    struct License {
        address contractAddress;
        address owner;
        address coordinator;
        string name;
        string symbol;
        bool isActive;
        uint256 timestamp;
    }
    event NewLicenseContract(address indexed contractAddress, uint256 tokenId, address indexed creator, uint256 timestamp);
    event OwnerChanged(address indexed newOwner, address indexed oldOwner, uint256 timestamp);
    event AddCoordinator(address indexed coordinator, uint256 timestamp);

    mapping(uint256 => License) public licenseContracts;
    address[] public allLicenses;
    uint256[] public tokenIds;
    address private immutable primary_marketplace = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address private immutable secondary_marketplace = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    address private immutable administrator = 0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2;
    mapping(address => bool) private coordinators;
    address public owner;

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    
    modifier checkAccess(){
        require(msg.sender == administrator, "Not authorized");
        _;
    }

    modifier onlyCoordinator(){
        require(coordinators[msg.sender] == true, "Not authorized");
        _;
    }

    modifier onlyOwner{
        require(msg.sender == owner, "You are not the owner");
        _;
    }

    constructor() checkAccess{
        owner = msg.sender;
    }

    function createLicense(
        string memory name,
        string memory symbol,
        bool isActive
    ) external onlyCoordinator returns (address) {
        LicenseContract newLicense = new LicenseContract(name, symbol);
        address licenseAddress = address(newLicense);
        allLicenses.push(licenseAddress);

        uint256 licenseId = _tokenIdCounter.current();
        tokenIds.push(licenseId);
        License memory licenseInstance = License(licenseAddress, primary_marketplace, administrator, name, symbol, isActive, block.timestamp);
        licenseContracts[licenseId] =  licenseInstance;

        _tokenIdCounter.increment();

        emit NewLicenseContract(licenseAddress, licenseId, msg.sender, block.timestamp);
        return address(newLicense);
    }

    function changeLicenseStatus(uint256 licenseId, bool status) external {
        address license_owner = licenseContracts[licenseId].owner;
        require(license_owner == msg.sender || msg.sender == administrator);
        licenseContracts[licenseId].isActive = status;
    }

    function setOwner(address newOwner) external onlyOwner{
        owner = newOwner;
        emit OwnerChanged(newOwner, msg.sender, block.timestamp);
    }

    function setCoordinator(address _coordinator, bool status) external onlyOwner{
        coordinators[_coordinator] = status;
        emit AddCoordinator(_coordinator, block.timestamp);
    }

    function getLicenseFromID(uint256 id) external view returns(License memory){
        return licenseContracts[id];
    }

    function getOwnerOfLicense(uint256 id) external view returns(address){
        return licenseContracts[id].owner;
    }

    function getCoordinator(uint256 id) external view returns(address){
        return licenseContracts[id].coordinator;
    }

    function getAllLicenseIds() external view returns(uint256[] memory){
        return tokenIds;
    }


}