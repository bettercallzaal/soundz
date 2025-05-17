// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {AuctionHouse} from "../src/AuctionHouse.sol";
import {ZoundZ721} from "../src/ZoundZ721.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract AuctionHouseEdgeTest is Test {
    AuctionHouse public implementation;
    AuctionHouse public proxy;
    ZoundZ721 public nft;
    
    address public owner = makeAddr("owner");
    address public feeReceiver = makeAddr("feeReceiver");
    address public artist = makeAddr("artist");
    address public bidder1 = makeAddr("bidder1");
    address public bidder2 = makeAddr("bidder2");
    
    uint256 public tokenId;
    string public constant TEST_URI = "ipfs://QmTest";
    string public constant TEST_COMMENT = "Great track!";

    function setUp() public {
        // Deploy NFT contract
        ZoundZ721 nftImpl = new ZoundZ721();
        bytes memory nftInitData = abi.encodeWithSelector(
            ZoundZ721.initialize.selector,
            owner,
            feeReceiver
        );
        ERC1967Proxy nftProxy = new ERC1967Proxy(
            address(nftImpl),
            nftInitData
        );
        nft = ZoundZ721(address(nftProxy));

        // Deploy auction house
        implementation = new AuctionHouse();
        bytes memory initData = abi.encodeWithSelector(
            AuctionHouse.initialize.selector,
            owner,
            feeReceiver,
            address(nft)
        );
        ERC1967Proxy proxyContract = new ERC1967Proxy(
            address(implementation),
            initData
        );
        proxy = AuctionHouse(address(proxyContract));

        // Grant roles
        vm.startPrank(owner);
        proxy.grantRole(proxy.DEFAULT_ADMIN_ROLE(), owner);
        proxy.grantRole(proxy.PAUSER_ROLE(), owner);
        vm.stopPrank();

        // Mint NFT and approve auction house
        vm.startPrank(artist);
        tokenId = nft.mintTrack(artist, TEST_URI);
        nft.approve(address(proxy), tokenId);
        vm.stopPrank();
    }

    function test_MaxBidValue() public {
        // Test bidding with max uint256 value
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        vm.deal(bidder1, type(uint256).max);
        vm.prank(bidder1);
        proxy.placeBid{value: type(uint256).max}(tokenId, TEST_COMMENT);

        // Verify bid was accepted
        (, , , uint256 highestBid, address highestBidder, , , ) = proxy.auctions(tokenId);
        assertEq(highestBid, type(uint256).max);
        assertEq(highestBidder, bidder1);
    }

    function test_LongComment() public {
        // Test bidding with very long comment
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        string memory longComment = "";
        for(uint i = 0; i < 100; i++) {
            longComment = string.concat(longComment, "This is a very long comment. ");
        }

        vm.deal(bidder1, 1 ether);
        vm.prank(bidder1);
        proxy.placeBid{value: 1 ether}(tokenId, longComment);

        // Verify bid was accepted with long comment
        (, , , , , string memory storedComment, , ) = proxy.auctions(tokenId);
        assertEq(storedComment, longComment);
    }

    function test_MinimumBidIncrement() public {
        // Test minimum bid increment (1 wei)
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        // Place initial bid
        vm.deal(bidder1, 100);
        vm.prank(bidder1);
        proxy.placeBid{value: 100}(tokenId, "Initial bid");

        // Place bid with minimum increment
        vm.deal(bidder2, 101);
        vm.prank(bidder2);
        proxy.placeBid{value: 101}(tokenId, "Minimum increment bid");

        // Verify second bid was accepted
        (, , , uint256 highestBid, address highestBidder, , , ) = proxy.auctions(tokenId);
        assertEq(highestBid, 101);
        assertEq(highestBidder, bidder2);
    }

    function test_LastSecondBid() public {
        // Test bidding in the last second
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        // Place initial bid
        vm.deal(bidder1, 1 ether);
        vm.prank(bidder1);
        proxy.placeBid{value: 1 ether}(tokenId, "Initial bid");

        // Fast forward to last second
        vm.warp(block.timestamp + 24 hours - 1);

        // Place bid in last second
        vm.deal(bidder2, 2 ether);
        vm.prank(bidder2);
        proxy.placeBid{value: 2 ether}(tokenId, "Last second bid");

        // Verify auction was extended
        (, , uint256 endTime, uint256 highestBid, address highestBidder, , , ) = proxy.auctions(tokenId);
        assertEq(highestBid, 2 ether);
        assertEq(highestBidder, bidder2);
        assertEq(endTime, block.timestamp + 5 minutes);
    }

    function test_MultipleLastSecondBids() public {
        // Test multiple last second bids
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        // Place initial bid
        vm.deal(bidder1, 1 ether);
        vm.prank(bidder1);
        proxy.placeBid{value: 1 ether}(tokenId, "Initial bid");

        // Fast forward to last minute
        vm.warp(block.timestamp + 24 hours - 1 minutes);

        // Place multiple last-minute bids
        uint256 lastBid = 1 ether;
        for(uint i = 0; i < 5; i++) {
            lastBid += 1 ether;
            vm.deal(bidder2, lastBid);
            vm.prank(bidder2);
            proxy.placeBid{value: lastBid}(tokenId, string.concat("Last minute bid #", vm.toString(i + 1)));

            lastBid += 1 ether;
            vm.deal(bidder1, lastBid);
            vm.prank(bidder1);
            proxy.placeBid{value: lastBid}(tokenId, string.concat("Counter bid #", vm.toString(i + 1)));

            // Verify auction was extended each time
            (, , uint256 endTime, , , , , ) = proxy.auctions(tokenId);
            assertEq(endTime, block.timestamp + 5 minutes);

            // Move forward 4 minutes
            vm.warp(block.timestamp + 4 minutes);
        }
    }

    function test_BoundaryTimestamps() public {
        // Test auction with boundary timestamps
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        // Set block timestamp to max uint32 (Feb 2106) - 24 hours
        vm.warp(type(uint32).max - 24 hours);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        // Place bid
        vm.deal(bidder1, 1 ether);
        vm.prank(bidder1);
        proxy.placeBid{value: 1 ether}(tokenId, "Bid near uint32 max");

        // Verify auction state
        (, uint256 startTime, uint256 endTime, , , , , ) = proxy.auctions(tokenId);
        assertTrue(startTime <= type(uint32).max);
        assertTrue(endTime <= type(uint32).max);
    }
}
