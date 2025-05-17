// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../../src/AuctionHouse.sol";

contract MaliciousBidder {
    AuctionHouse public immutable target;
    uint256 public attackCount;

    constructor(address _target) {
        target = AuctionHouse(_target);
    }

    receive() external payable {
        if (attackCount < 2) {
            attackCount++;
            // Try to bid again during ETH refund
            target.placeBid{value: msg.value}(0, "Malicious bid");
        }
    }

    function bid(uint256 tokenId, uint256 amount) external {
        target.placeBid{value: amount}(tokenId, "Malicious bid");
    }
}
