// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "forge-std/Script.sol";
import {BaseScript} from "../helpers/BaseScript.s.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ApproveForSecondary is BaseScript {
    event SecondaryApproval(address license, bool approved, address secondaryProxy);

    function run(address license, bool approved) public {
        BaseScript.CoreConfig memory cfg = loadCore();

        beginBroadcast(cfg.deployerKey);
        IERC721(license).setApprovalForAll(cfg.secondaryProxy, approved);
        endBroadcast();

        emit SecondaryApproval(license, approved, cfg.secondaryProxy);
        console.log("Updated secondary approval:");
        console.log("  license:", license);
        console.log("  operator:", cfg.secondaryProxy);
        console.log("  approved:", approved);
    }
}
