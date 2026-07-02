// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract VECTORToken is ERC20, ERC20Burnable, ERC20Permit, Ownable2Step, Pausable {
    uint8 public constant TOKEN_DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY = 10_000_000_000 * 10 ** TOKEN_DECIMALS;
    uint16 public constant MAX_BPS = 10_000;

    string public constant WEBSITE = "playonvector.com";

    mapping(address => bool) public isBlacklisted;
    mapping(address => bool) public isTaxExempt;
    mapping(address => bool) public isAMMPair;

    bool public taxEnabled;
    bool public taxLockedForever;

    uint16 public buyTaxBps;
    uint16 public sellTaxBps;
    uint16 public transferTaxBps;

    address public taxWallet;

    event BlacklistUpdated(address indexed account, bool blacklisted);
    event TaxExemptionUpdated(address indexed account, bool exempt);
    event AMMPairUpdated(address indexed pair, bool isPair);
    event TaxWalletUpdated(address indexed previousWallet, address indexed newWallet);
    event TaxEnabledUpdated(bool enabled);
    event TaxRatesUpdated(uint16 buyTaxBps, uint16 sellTaxBps, uint16 transferTaxBps);
    event TaxLockedForever();

    error ZeroAddress();
    error Blacklisted(address account);
    error InvalidTaxBps(uint256 provided);
    error TaxLocked();

    constructor(address initialOwner, address initialTaxWallet)
        ERC20("VECTOR Token", "VCTR")
        ERC20Permit("VECTOR Token")
        Ownable(initialOwner)
    {
        if (initialOwner == address(0) || initialTaxWallet == address(0)) {
            revert ZeroAddress();
        }

        taxWallet = initialTaxWallet;

        isTaxExempt[initialOwner] = true;
        isTaxExempt[initialTaxWallet] = true;
        isTaxExempt[address(this)] = true;

        _mint(initialOwner, INITIAL_SUPPLY);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        _mint(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setBlacklist(address account, bool blacklisted) external onlyOwner {
        isBlacklisted[account] = blacklisted;
        emit BlacklistUpdated(account, blacklisted);
    }

    function setBlacklistBatch(address[] calldata accounts, bool blacklisted) external onlyOwner {
        uint256 length = accounts.length;
        for (uint256 i = 0; i < length; ++i) {
            isBlacklisted[accounts[i]] = blacklisted;
            emit BlacklistUpdated(accounts[i], blacklisted);
        }
    }

    function setTaxExempt(address account, bool exempt) external onlyOwner {
        isTaxExempt[account] = exempt;
        emit TaxExemptionUpdated(account, exempt);
    }

    function setTaxExemptBatch(address[] calldata accounts, bool exempt) external onlyOwner {
        uint256 length = accounts.length;
        for (uint256 i = 0; i < length; ++i) {
            isTaxExempt[accounts[i]] = exempt;
            emit TaxExemptionUpdated(accounts[i], exempt);
        }
    }

    function setAMMPair(address pair, bool value) external onlyOwner {
        if (pair == address(0)) revert ZeroAddress();
        isAMMPair[pair] = value;
        emit AMMPairUpdated(pair, value);
    }

    function setTaxWallet(address newTaxWallet) external onlyOwner {
        if (newTaxWallet == address(0)) revert ZeroAddress();
        address oldWallet = taxWallet;
        taxWallet = newTaxWallet;
        emit TaxWalletUpdated(oldWallet, newTaxWallet);
    }

    function setTaxEnabled(bool enabled) external onlyOwner {
        if (taxLockedForever) revert TaxLocked();
        taxEnabled = enabled;
        emit TaxEnabledUpdated(enabled);
    }

    function setTaxRates(uint16 newBuyTaxBps, uint16 newSellTaxBps, uint16 newTransferTaxBps) external onlyOwner {
        if (taxLockedForever) revert TaxLocked();

        if (newBuyTaxBps > MAX_BPS) revert InvalidTaxBps(newBuyTaxBps);
        if (newSellTaxBps > MAX_BPS) revert InvalidTaxBps(newSellTaxBps);
        if (newTransferTaxBps > MAX_BPS) revert InvalidTaxBps(newTransferTaxBps);

        buyTaxBps = newBuyTaxBps;
        sellTaxBps = newSellTaxBps;
        transferTaxBps = newTransferTaxBps;

        emit TaxRatesUpdated(newBuyTaxBps, newSellTaxBps, newTransferTaxBps);
    }

    function lockTaxForever() external onlyOwner {
        taxLockedForever = true;
        taxEnabled = false;
        buyTaxBps = 0;
        sellTaxBps = 0;
        transferTaxBps = 0;

        emit TaxEnabledUpdated(false);
        emit TaxRatesUpdated(0, 0, 0);
        emit TaxLockedForever();
    }

    function previewTransferTax(address from, address to, uint256 amount)
        external
        view
        returns (uint256 taxAmount, uint256 netAmount)
    {
        uint16 appliedBps = _getTaxBps(from, to);

        if (
            !taxEnabled || amount == 0 || from == address(0) || to == address(0) || isTaxExempt[from] || isTaxExempt[to]
                || taxWallet == address(0)
        ) {
            return (0, amount);
        }

        taxAmount = (amount * appliedBps) / MAX_BPS;
        netAmount = amount - taxAmount;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (paused()) {
            revert EnforcedPause();
        }

        if (from != address(0) && isBlacklisted[from]) revert Blacklisted(from);
        if (to != address(0) && isBlacklisted[to]) revert Blacklisted(to);

        bool isMint = from == address(0);
        bool isBurn = to == address(0);

        if (isMint || isBurn || !_shouldTakeTax(from, to, value)) {
            super._update(from, to, value);
            return;
        }

        uint16 taxBps = _getTaxBps(from, to);
        uint256 taxAmount = (value * taxBps) / MAX_BPS;
        uint256 netAmount = value - taxAmount;

        if (taxAmount > 0) {
            super._update(from, taxWallet, taxAmount);
        }

        super._update(from, to, netAmount);
    }

    function _shouldTakeTax(address from, address to, uint256 value) internal view returns (bool) {
        if (!taxEnabled) return false;
        if (value == 0) return false;
        if (from == address(0) || to == address(0)) return false;
        if (isTaxExempt[from] || isTaxExempt[to]) return false;
        if (taxWallet == address(0)) return false;

        return _getTaxBps(from, to) > 0;
    }

    function _getTaxBps(address from, address to) internal view returns (uint16) {
        bool fromIsPair = isAMMPair[from];
        bool toIsPair = isAMMPair[to];

        if (fromIsPair && !toIsPair) {
            return buyTaxBps;
        }

        if (!fromIsPair && toIsPair) {
            return sellTaxBps;
        }

        return transferTaxBps;
    }
}
