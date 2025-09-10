// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

error notNFTOwner(address caller);
error priceIsInvalid(uint256 price);
error offerInactive(uint256 offerId);
error notSeller(address caller);
error cannotBuyYourOwnOffer(address caller);
error insufficientPayment(uint256 offerId, uint256 payment);
error alreadyListed(uint256 offerId);
error UnApprovedNFT(address licenseAddress, uint256 tokenId);
error ContractNotOwner();
error offerAlreadyActive(uint256 offerId);
error NftTransferFailed(address from, address to, uint256 tokenId);
