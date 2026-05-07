// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

error notFactory(address caller);
error notOwnerOrFactory(address caller);
error notPrimaryOrSecondary(address caller);
error notPrimaryMarketPlace();
error TokenLocked(uint256 tokenId);
