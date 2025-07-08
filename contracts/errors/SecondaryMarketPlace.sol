// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

error notNFTOwner(address caller);
error priceIsNotPositive(uint256 price);
error offerInactive(uint256 offerId);
error notSeller(address caller);
error cannotBuyYourOwnOffer(address caller);
error insufficientPayment(uint256 offerId, uint256 payment);
