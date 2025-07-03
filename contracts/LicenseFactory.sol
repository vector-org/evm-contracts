// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LicenseContract.sol";
import "./Interfaces/ILicenseContract.sol";
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
        uint256 developerFee;
        uint256 platformFee;
        uint256 publisherFee;
        address developer;
        address publisher;
        address platform;
    }

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
        LicenseInput memory licenseInput
    ) external onlyCoordinator returns (address) {
        address newLicenseAddress = address(new LicenseContract(licenseInput.name, licenseInput.symbol));
        allLicenses.push(newLicenseAddress);

        tokenIds.push(_tokenIdCounter.current());

        License storage licenseSlot = licenseContracts[_tokenIdCounter.current()];
        licenseSlot.contractAddress = newLicenseAddress;
        licenseSlot.owner = primary_marketplace;
        licenseSlot.coordinator = administrator;
        licenseSlot.name = licenseInput.name;
        licenseSlot.symbol = licenseInput.symbol;
        licenseSlot.isActive = licenseInput.isActive;
        licenseSlot.timestamp = block.timestamp;
        licenseSlot.developerFee = licenseInput.developerFee;
        licenseSlot.platformFee = licenseInput.platformFee;
        licenseSlot.publisherFee = licenseInput.publisherFee;
        licenseSlot.developer = licenseInput.developer;
        licenseSlot.publisher = licenseInput.publisher;
        licenseSlot.platform = licenseInput.platform;

        emit NewLicenseContract(newLicenseAddress, _tokenIdCounter.current(), msg.sender, block.timestamp);
        _tokenIdCounter.increment();
        return newLicenseAddress;
    }


    function changeLicenseStatus(uint256 licenseId, bool status) external {
        address license_owner = licenseContracts[licenseId].owner;
        require(license_owner == msg.sender || msg.sender == administrator);
        licenseContracts[licenseId].isActive = status;
    }

    function updateLicense(uint256 licenseId, string memory uri) external {
        address license_address = licenseContracts[licenseId].contractAddress;
        require(license_address != address(0), "License does not exist");
        require(msg.sender == licenseContracts[licenseId].owner || msg.sender == administrator || msg.sender == primary_marketplace, "Not authorized to update license");
        ILicenseContract licenseContract = ILicenseContract(license_address);
        licenseContract.updateTokenURI(licenseId, uri);
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