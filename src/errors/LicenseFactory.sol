// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

error notAdminOrOwner(address caller);
error licenseNotFound(uint256 id);
error cannotUpdateLicense(address caller);
