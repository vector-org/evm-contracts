// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

error notNFTOwner(address caller);
error priceIsNotPositive(uint256 price);
error offerInactive(uint256 offerId);
error notSeller(address caller);
error cannotBuyYourOwnOffer(address caller);
error insufficientPayment(uint256 offerId, uint256 payment);
error alreadyListed(uint256 offerId);
error UnApprovedNFT(address licenseAddress, uint256 tokenId);
error SellerNotOwner(address seller);
error offerAlreadyActive(uint256 offerId);
error ETHTransfersNotAllowed();
