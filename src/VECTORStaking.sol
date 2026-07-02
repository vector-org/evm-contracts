// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @author Vector Blockchain AG
 * @title VECTORStaking
 * @notice Lockbox staking contract for VECTOR tokens.
 * @dev Rewards are intentionally out of scope for v1. Monthly reward processors
 *      can replay Staked/Unstaked events and use eligible-month buckets. UTC
 *      month accounting uses the accepted block timestamp, not local node time.
 */
contract VECTORStaking is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct StakeBucket {
        uint256 eligibleMonth;
        uint256 amount;
    }

    /// @notice ERC20 token users lock in this contract.
    IERC20 public immutable stakingToken; // solhint-disable-line immutable-vars-naming

    /// @notice Total amount of VECTOR currently locked.
    uint256 public totalStaked;

    mapping(address => uint256) private _balances;
    mapping(address => StakeBucket[]) private _stakeBuckets;

    uint256 private constant SECONDS_PER_DAY = 24 hours;
    int256 private constant OFFSET19700101 = 2440588;

    /**
     * @notice Emitted after tokens are locked.
     * @param account Staker address.
     * @param amount Amount locked.
     * @param eligibleMonth First UTC calendar month where the stake counts.
     * @param timestamp Block timestamp for off-chain monthly processors.
     */
    event Staked(address indexed account, uint256 amount, uint256 indexed eligibleMonth, uint256 timestamp);
    /**
     * @notice Emitted after tokens are unlocked.
     * @param account Staker address.
     * @param amount Amount unlocked.
     * @param timestamp Block timestamp for off-chain monthly processors.
     */
    event Unstaked(address indexed account, uint256 amount, uint256 timestamp);

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientStakedBalance(uint256 requested, uint256 available);
    error UnexpectedTokenDelta(uint256 expectedAmount, uint256 actualAmount);

    /**
     * @notice Deploy the staking lockbox.
     * @param vectorToken VECTOR ERC20 token.
     * @param initialOwner Owner that can pause and unpause staking.
     */
    constructor(IERC20 vectorToken, address initialOwner) Ownable(initialOwner) {
        if (address(vectorToken) == address(0) || initialOwner == address(0)) {
            revert ZeroAddress();
        }

        stakingToken = vectorToken;
    }

    /**
     * @notice Lock VECTOR tokens until the caller unstakes them.
     * @param amount Amount to lock.
     */
    function stake(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 balanceBefore = stakingToken.balanceOf(address(this));
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = stakingToken.balanceOf(address(this)) - balanceBefore;

        if (received != amount) {
            revert UnexpectedTokenDelta(amount, received);
        }

        uint256 eligibleMonth = _firstEligibleBucketId();
        _balances[msg.sender] += amount;
        totalStaked += amount;
        _addToBucket(msg.sender, eligibleMonth, amount);

        emit Staked(msg.sender, amount, eligibleMonth, block.timestamp);
    }

    /**
     * @notice Unlock staked VECTOR tokens.
     * @param amount Amount to unlock.
     */
    function unstake(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 accountBalance = _balances[msg.sender];
        if (amount > accountBalance) {
            revert InsufficientStakedBalance(amount, accountBalance);
        }

        _balances[msg.sender] = accountBalance - amount;
        totalStaked -= amount;
        _removeFromNewestBuckets(msg.sender, amount);

        uint256 contractBalanceBefore = stakingToken.balanceOf(address(this));
        uint256 recipientBalanceBefore = stakingToken.balanceOf(msg.sender);
        stakingToken.safeTransfer(msg.sender, amount);
        uint256 contractDelta = contractBalanceBefore - stakingToken.balanceOf(address(this));
        uint256 recipientDelta = stakingToken.balanceOf(msg.sender) - recipientBalanceBefore;

        if (contractDelta != amount || recipientDelta != amount) {
            revert UnexpectedTokenDelta(amount, recipientDelta);
        }

        emit Unstaked(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Return the total locked balance for an account.
     * @param account Staker address.
     * @return Amount currently locked by the account.
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    /**
     * @notice Return the account balance eligible in the current UTC month.
     * @param account Staker address.
     * @return eligibleBalance Balance eligible for the current month.
     */
    function eligibleBalanceOf(address account) public view returns (uint256 eligibleBalance) {
        StakeBucket[] storage buckets = _stakeBuckets[account];
        uint256 length = buckets.length;

        for (uint256 i = 0; i < length; ++i) {
            if (_isBucketEligible(buckets[i].eligibleMonth)) {
                eligibleBalance += buckets[i].amount;
            }
        }
    }

    /**
     * @notice Return the account balance waiting for future eligibility.
     * @param account Staker address.
     * @return pendingBalance Balance not yet eligible.
     */
    function pendingBalanceOf(address account) external view returns (uint256 pendingBalance) {
        uint256 accountBalance = _balances[account];
        uint256 eligibleBalance = eligibleBalanceOf(account);
        return accountBalance - eligibleBalance;
    }

    /**
     * @notice Return all active eligibility buckets for an account.
     * @param account Staker address.
     * @return Active stake buckets.
     */
    function getStakeBuckets(address account) external view returns (StakeBucket[] memory) {
        return _stakeBuckets[account];
    }

    /**
     * @notice Return how many active eligibility buckets an account has.
     * @param account Staker address.
     * @return Number of active buckets.
     */
    function stakeBucketCount(address account) external view returns (uint256) {
        return _stakeBuckets[account].length;
    }

    /**
     * @notice Return one active eligibility bucket.
     * @param account Staker address.
     * @param index Bucket index.
     * @return eligibleMonth First eligible UTC month.
     * @return amount Amount in the bucket.
     */
    function stakeBucketAt(address account, uint256 index)
        external
        view
        returns (uint256 eligibleMonth, uint256 amount)
    {
        StakeBucket storage bucket = _stakeBuckets[account][index];
        return (bucket.eligibleMonth, bucket.amount);
    }

    /**
     * @notice Return the current UTC calendar month identifier.
     * @dev `block.timestamp` is the canonical timestamp in the accepted block
     *      header. This is suitable for month-level accounting and is not used
     *      for randomness or high-precision ordering.
     * @return Current month ID, encoded as year * 12 + month.
     */
    function currentMonthId() public view virtual returns (uint256) {
        return monthIdForTimestamp(block.timestamp);
    }

    /**
     * @notice Convert a timestamp to a UTC calendar month identifier.
     * @param timestamp Unix timestamp.
     * @return Month ID, encoded as year * 12 + month.
     */
    function monthIdForTimestamp(uint256 timestamp) public pure returns (uint256) {
        (uint256 year, uint256 month,) = _daysToDate(timestamp / SECONDS_PER_DAY);
        return year * 12 + month;
    }

    /// @notice Pause staking and unstaking.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resume staking and unstaking.
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Return the bucket identifier assigned to a new stake.
     * @dev Production uses the next UTC calendar month. Testnet variants can
     *      override this clock without changing the staking mechanics. Future
     *      rewards should only be computed for closed month windows.
     * @return First eligible bucket identifier.
     */
    function _firstEligibleBucketId() internal view virtual returns (uint256) {
        return currentMonthId() + 1;
    }

    /**
     * @notice Return whether a bucket is eligible in the current reward window.
     * @param eligibleBucketId First eligible bucket identifier.
     * @return True when the bucket is currently eligible.
     */
    function _isBucketEligible(uint256 eligibleBucketId) internal view virtual returns (bool) {
        return eligibleBucketId < currentMonthId() + 1;
    }

    /**
     * @notice Add stake to the account bucket for an eligible month.
     * @param account Staker address.
     * @param eligibleMonth First eligible UTC month.
     * @param amount Amount to add.
     */
    function _addToBucket(address account, uint256 eligibleMonth, uint256 amount) private {
        StakeBucket[] storage buckets = _stakeBuckets[account];
        uint256 length = buckets.length;

        if (length > 0 && buckets[length - 1].eligibleMonth == eligibleMonth) {
            buckets[length - 1].amount += amount;
            return;
        }

        buckets.push(StakeBucket({eligibleMonth: eligibleMonth, amount: amount}));
    }

    /**
     * @notice Remove stake from newest buckets first.
     * @param account Staker address.
     * @param amount Amount to remove.
     */
    function _removeFromNewestBuckets(address account, uint256 amount) private {
        StakeBucket[] storage buckets = _stakeBuckets[account];
        uint256 remaining = amount;

        while (remaining > 0) {
            uint256 lastIndex = buckets.length - 1;
            StakeBucket storage bucket = buckets[lastIndex];

            if (bucket.amount > remaining) {
                bucket.amount -= remaining;
                remaining = 0;
            } else {
                remaining -= bucket.amount;
                buckets.pop();
            }
        }
    }

    /**
     * @notice Convert days since Unix epoch to a UTC Gregorian date.
     * @param daysSinceEpoch Days since 1970-01-01.
     * @return year UTC year.
     * @return month UTC month.
     * @return day UTC day.
     */
    function _daysToDate(uint256 daysSinceEpoch) private pure returns (uint256 year, uint256 month, uint256 day) {
        // Unix day counts for supported EVM timestamps are safely below int256 max.
        // forge-lint: disable-next-line(unsafe-typecast)
        int256 daysValue = int256(daysSinceEpoch);
        int256 dateValue = daysValue + 68569 + OFFSET19700101;
        int256 era = (4 * dateValue) / 146097;
        dateValue = dateValue - (146097 * era + 3) / 4;
        int256 yearValue = (4000 * (dateValue + 1)) / 1461001;
        dateValue = dateValue - (1461 * yearValue) / 4 + 31;
        int256 monthValue = (80 * dateValue) / 2447;
        int256 dayValue = dateValue - (2447 * monthValue) / 80;
        dateValue = monthValue / 11;
        monthValue = monthValue + 2 - 12 * dateValue;
        yearValue = 100 * (era - 49) + yearValue + dateValue;

        // The Gregorian conversion above only produces positive calendar parts.
        // forge-lint: disable-next-line(unsafe-typecast)
        year = uint256(yearValue);
        // forge-lint: disable-next-line(unsafe-typecast)
        month = uint256(monthValue);
        // forge-lint: disable-next-line(unsafe-typecast)
        day = uint256(dayValue);
    }
}
