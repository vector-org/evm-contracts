// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

error onlyAdmin(address caller);
error onlyCoordinator(address caller);
error onlyOwner(address caller);
error TransferFailed(address from, address to, uint256 amount);
error UnAuthorizedUser(address user);
