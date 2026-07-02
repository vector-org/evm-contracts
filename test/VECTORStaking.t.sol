// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {VECTORStaking} from "src/VECTORStaking.sol";
import {VECTORToken} from "src/VECTORToken.sol";

contract VECTORStakingTest is Test {
    ERC20Mock internal token;
    VECTORStaking internal staking;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal taxWallet = makeAddr("taxWallet");

    uint256 internal constant JULY_2026 = 2026 * 12 + 7;
    uint256 internal constant AUGUST_2026 = 2026 * 12 + 8;
    uint256 internal constant SEPTEMBER_2026 = 2026 * 12 + 9;

    uint256 internal constant JULY_15_2026_NOON_UTC = 1784116800;
    uint256 internal constant AUGUST_1_2026_UTC = 1785542400;
    uint256 internal constant AUGUST_15_2026_NOON_UTC = 1786795200;
    uint256 internal constant SEPTEMBER_1_2026_UTC = 1788220800;

    uint256 internal constant INITIAL_BALANCE = 1_000 ether;

    function setUp() public {
        token = new ERC20Mock();
        staking = new VECTORStaking(IERC20(address(token)), owner);

        token.mint(alice, INITIAL_BALANCE);

        vm.prank(alice);
        token.approve(address(staking), type(uint256).max);
    }

    function testStakeLocksTokensAndTracksTotals() public {
        vm.warp(JULY_15_2026_NOON_UTC);

        _stake(alice, 100 ether);

        assertEq(staking.balanceOf(alice), 100 ether);
        assertEq(staking.totalStaked(), 100 ether);
        assertEq(token.balanceOf(alice), INITIAL_BALANCE - 100 ether);
        assertEq(token.balanceOf(address(staking)), 100 ether);
        assertEq(staking.eligibleBalanceOf(alice), 0);
        assertEq(staking.pendingBalanceOf(alice), 100 ether);
        assertEq(staking.stakeBucketCount(alice), 1);

        (uint256 eligibleMonth, uint256 bucketAmount) = staking.stakeBucketAt(alice, 0);
        assertEq(eligibleMonth, AUGUST_2026);
        assertEq(bucketAmount, 100 ether);
    }

    function testUnstakeImmediatelyReturnsTokens() public {
        vm.warp(JULY_15_2026_NOON_UTC);
        _stake(alice, 100 ether);

        vm.prank(alice);
        staking.unstake(40 ether);

        assertEq(staking.balanceOf(alice), 60 ether);
        assertEq(staking.totalStaked(), 60 ether);
        assertEq(token.balanceOf(alice), INITIAL_BALANCE - 60 ether);
        assertEq(token.balanceOf(address(staking)), 60 ether);
    }

    function testZeroStakeReverts() public {
        vm.prank(alice);
        vm.expectRevert(VECTORStaking.ZeroAmount.selector);
        staking.stake(0);
    }

    function testZeroUnstakeReverts() public {
        vm.prank(alice);
        vm.expectRevert(VECTORStaking.ZeroAmount.selector);
        staking.unstake(0);
    }

    function testUnstakeAboveBalanceReverts() public {
        vm.warp(JULY_15_2026_NOON_UTC);
        _stake(alice, 100 ether);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(VECTORStaking.InsufficientStakedBalance.selector, 101 ether, 100 ether));
        staking.unstake(101 ether);
    }

    function testJulyStakeIsPendingInJulyAndEligibleInAugust() public {
        vm.warp(JULY_15_2026_NOON_UTC);
        _stake(alice, 100 ether);

        assertEq(staking.currentMonthId(), JULY_2026);
        assertEq(staking.eligibleBalanceOf(alice), 0);
        assertEq(staking.pendingBalanceOf(alice), 100 ether);

        vm.warp(AUGUST_1_2026_UTC);

        assertEq(staking.currentMonthId(), AUGUST_2026);
        assertEq(staking.eligibleBalanceOf(alice), 100 ether);
        assertEq(staking.pendingBalanceOf(alice), 0);
    }

    function testAugustStakeIsNotEligibleDuringAugust() public {
        vm.warp(AUGUST_15_2026_NOON_UTC);
        _stake(alice, 100 ether);

        assertEq(staking.currentMonthId(), AUGUST_2026);
        assertEq(staking.eligibleBalanceOf(alice), 0);
        assertEq(staking.pendingBalanceOf(alice), 100 ether);

        vm.warp(SEPTEMBER_1_2026_UTC);

        assertEq(staking.currentMonthId(), SEPTEMBER_2026);
        assertEq(staking.eligibleBalanceOf(alice), 100 ether);
        assertEq(staking.pendingBalanceOf(alice), 0);
    }

    function testPartialUnstakeRemovesNewestPendingBucketsFirst() public {
        vm.warp(JULY_15_2026_NOON_UTC);
        _stake(alice, 100 ether);

        vm.warp(AUGUST_15_2026_NOON_UTC);
        _stake(alice, 50 ether);

        assertEq(staking.eligibleBalanceOf(alice), 100 ether);
        assertEq(staking.pendingBalanceOf(alice), 50 ether);
        assertEq(staking.stakeBucketCount(alice), 2);

        vm.prank(alice);
        staking.unstake(60 ether);

        assertEq(staking.balanceOf(alice), 90 ether);
        assertEq(staking.eligibleBalanceOf(alice), 90 ether);
        assertEq(staking.pendingBalanceOf(alice), 0);
        assertEq(staking.stakeBucketCount(alice), 1);

        (uint256 eligibleMonth, uint256 bucketAmount) = staking.stakeBucketAt(alice, 0);
        assertEq(eligibleMonth, AUGUST_2026);
        assertEq(bucketAmount, 90 ether);
    }

    function testPauseBlocksStakeAndUnstake() public {
        vm.warp(JULY_15_2026_NOON_UTC);
        _stake(alice, 100 ether);

        vm.prank(owner);
        staking.pause();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        staking.stake(1 ether);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        staking.unstake(1 ether);
    }

    function testMonthIdUsesUtcCalendarMonths() public view {
        assertEq(staking.monthIdForTimestamp(JULY_15_2026_NOON_UTC), JULY_2026);
        assertEq(staking.monthIdForTimestamp(AUGUST_1_2026_UTC), AUGUST_2026);
        assertEq(staking.monthIdForTimestamp(SEPTEMBER_1_2026_UTC), SEPTEMBER_2026);
    }

    function testVectorTokenTaxRequiresStakingExemption() public {
        VECTORToken taxedToken = new VECTORToken(owner, taxWallet);
        VECTORStaking taxedStaking = new VECTORStaking(IERC20(address(taxedToken)), owner);

        vm.startPrank(owner);
        assertTrue(taxedToken.transfer(alice, 1_000 ether));
        taxedToken.setTaxRates(0, 0, 500);
        taxedToken.setTaxEnabled(true);
        vm.stopPrank();

        vm.prank(alice);
        taxedToken.approve(address(taxedStaking), type(uint256).max);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(VECTORStaking.UnexpectedTokenDelta.selector, 100 ether, 95 ether));
        taxedStaking.stake(100 ether);

        vm.prank(owner);
        taxedToken.setTaxExempt(address(taxedStaking), true);

        vm.prank(alice);
        taxedStaking.stake(100 ether);

        assertEq(taxedStaking.balanceOf(alice), 100 ether);
        assertEq(taxedToken.balanceOf(address(taxedStaking)), 100 ether);
    }

    function _stake(address account, uint256 amount) internal {
        vm.prank(account);
        staking.stake(amount);
    }
}
