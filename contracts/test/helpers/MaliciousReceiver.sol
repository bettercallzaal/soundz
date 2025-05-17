// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../../src/ZoundZ721.sol";

contract MaliciousReceiver {
    ZoundZ721 public immutable target;
    uint256 public attackCount;

    constructor(address _target) {
        target = ZoundZ721(_target);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external returns (bytes4) {
        if (attackCount < 2) {
            attackCount++;
            // Try to mint again during the first token transfer
            target.mintTrack(address(this), "ipfs://malicious");
        }
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }
}
