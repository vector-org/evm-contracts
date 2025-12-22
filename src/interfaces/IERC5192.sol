// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC5192
 * @notice Minimal Soulbound Token interface (ERC-5192)
 * @dev See https://eips.ethereum.org/EIPS/eip-5192
 */
interface IERC5192 {
    /// @notice Emitted when a token becomes locked (soulbound)
    event Locked(uint256 tokenId);

    /// @notice Emitted when a token becomes unlocked (transferable)
    event Unlocked(uint256 tokenId);

    /// @notice Returns the locked status of a token
    /// @param tokenId The token ID to check
    /// @return True if the token is locked (non-transferable)
    function locked(uint256 tokenId) external view returns (bool);
}
