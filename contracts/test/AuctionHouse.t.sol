// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {AuctionHouse} from "../src/AuctionHouse.sol";
import {ZoundZ721} from "../src/ZoundZ721.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract AuctionHouseTest is Test {
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

    function test_CreateAuction() public {
        // Transfer NFT to auction house
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);

        // Create auction
        vm.prank(artist);
        proxy.createAuction(tokenId);

        // Check auction state
        (
            address auctionArtist,
            uint256 startTime,
            uint256 endTime,
            uint256 highestBid,
            address highestBidder,
            string memory comment,
            bool settled,
            bool cancelled
        ) = proxy.auctions(tokenId);

        assertEq(auctionArtist, artist);
        assertEq(startTime, block.timestamp);
        assertEq(endTime, block.timestamp + 24 hours);
        assertEq(highestBid, 0);
        assertEq(highestBidder, address(0));
        assertEq(comment, "");
        assertFalse(settled);
        assertFalse(cancelled);
    }

    function test_PlaceBid() public {
        // Setup auction
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        // Record creation time
        uint256 creationTime = block.timestamp;

        // Place bid
        vm.deal(bidder1, 1 ether);
        vm.prank(bidder1);
        proxy.placeBid{value: 1 ether}(tokenId, TEST_COMMENT);

        // Check auction state
        (
            ,
            uint256 startTime,
            uint256 endTime,
            uint256 highestBid,
            address highestBidder,
            string memory comment,
            ,
            
        ) = proxy.auctions(tokenId);

        assertEq(startTime, creationTime);
        assertEq(endTime, creationTime + 24 hours);
        assertEq(highestBid, 1 ether);
        assertEq(highestBidder, bidder1);
        assertEq(comment, TEST_COMMENT);
    }

    function test_AntiSnipe() public {
        // Setup auction with initial bid
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        vm.deal(bidder1, 1 ether);
        vm.prank(bidder1);
        proxy.placeBid{value: 1 ether}(tokenId, "First bid");

        // Fast forward to near end
        vm.warp(block.timestamp + 23 hours + 57 minutes);

        // Place snipe bid
        vm.deal(bidder2, 2 ether);
        vm.prank(bidder2);
        proxy.placeBid{value: 2 ether}(tokenId, "Snipe bid");

        // Check auction was extended
        (, , uint256 endTime, , , , , ) = proxy.auctions(tokenId);
        assertEq(endTime, block.timestamp + 5 minutes);
    }

    function test_SettleAuction() public {
        // Setup auction with bid
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        vm.deal(bidder1, 1 ether);
        vm.prank(bidder1);
        proxy.placeBid{value: 1 ether}(tokenId, TEST_COMMENT);

        // Fast forward past end time
        vm.warp(block.timestamp + 25 hours);

        // Get balances before settlement
        uint256 artistBalanceBefore = artist.balance;
        uint256 feeReceiverBalanceBefore = feeReceiver.balance;

        // Settle auction
        proxy.settleAuction(tokenId);

        // Check NFT was transferred
        assertEq(nft.ownerOf(tokenId), bidder1);

        // Withdraw funds
        vm.prank(artist);
        proxy.withdraw();
        vm.prank(feeReceiver);
        proxy.withdraw();

        // Check funds were distributed
        assertEq(artist.balance - artistBalanceBefore, 0.975 ether); // 97.5%
        assertEq(feeReceiver.balance - feeReceiverBalanceBefore, 0.025 ether); // 2.5%
    }

    function test_ArtistCancel() public {
        // Setup auction without bids
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        // Fast forward 7 days
        vm.warp(block.timestamp + 7 days + 1);

        // Cancel auction
        vm.prank(artist);
        proxy.artistCancel(tokenId);

        // Check NFT was returned
        assertEq(nft.ownerOf(tokenId), artist);

        // Check auction was marked as cancelled
        (, , , , , , , bool cancelled) = proxy.auctions(tokenId);
        assertTrue(cancelled);
    }

    function test_RevertWhen_NonArtistCreatesAuction() public {
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);

        vm.prank(bidder1);
        vm.expectRevert("Not token artist");
        proxy.createAuction(tokenId);
    }

    function test_RevertWhen_BidTooLow() public {
        // Setup auction with initial bid
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        vm.deal(bidder1, 1 ether);
        vm.prank(bidder1);
        proxy.placeBid{value: 1 ether}(tokenId, "First bid");

        // Try to place lower bid
        vm.deal(bidder2, 0.5 ether);
        vm.prank(bidder2);
        vm.expectRevert("Bid too low");
        proxy.placeBid{value: 0.5 ether}(tokenId, "Low bid");
    }

    function test_RevertWhen_EarlyCancel() public {
        // Setup auction without bids
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        // Try to cancel before 7 days
        vm.prank(artist);
        vm.expectRevert("Too early to cancel");
        proxy.artistCancel(tokenId);
    }

    function test_RevertWhen_CancelWithBids() public {
        // Setup auction with bid
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        vm.deal(bidder1, 1 ether);
        vm.prank(bidder1);
        proxy.placeBid{value: 1 ether}(tokenId, TEST_COMMENT);

        // Fast forward 7 days
        vm.warp(block.timestamp + 7 days + 1);

        // Try to cancel
        vm.prank(artist);
        vm.expectRevert("Bids already placed");
        proxy.artistCancel(tokenId);
    }

    function test_UnpauseFlow() public {
        // Pause everything
        vm.startPrank(owner);
        proxy.pauseBidding();
        proxy.pauseSettlement();
        proxy.pauseAuctionCreation();

        // Initiate unpause
        proxy.initiateUnpause();

        // Try to unpause immediately
        vm.expectRevert("Unpause delay not elapsed");
        proxy.unpauseBidding();
        vm.expectRevert("Unpause delay not elapsed");
        proxy.unpauseSettlement();
        vm.expectRevert("Unpause delay not elapsed");
        proxy.unpauseAuctionCreation();

        // Fast forward past delay
        vm.warp(block.timestamp + 24 hours + 1);

        // Now unpause should work
        proxy.unpauseBidding();
        proxy.unpauseSettlement();
        proxy.unpauseAuctionCreation();
        vm.stopPrank();

        // Verify everything is unpaused
        assertFalse(proxy.biddingPaused());
        assertFalse(proxy.settlementPaused());
        assertFalse(proxy.auctionCreationPaused());
    }

    function test_RevertWhen_UnpauseBeforeInitiation() public {
        // Pause everything
        vm.startPrank(owner);
        proxy.pauseBidding();
        proxy.pauseSettlement();
        proxy.pauseAuctionCreation();

        // Verify unpauseAfter is 0
        assertEq(proxy.unpauseAfter(), 0);

        // Try to unpause without initiation
        vm.expectRevert("Unpause not initiated");
        proxy.unpauseBidding();
        vm.expectRevert("Unpause not initiated");
        proxy.unpauseSettlement();
        vm.expectRevert("Unpause not initiated");
        proxy.unpauseAuctionCreation();
        vm.stopPrank();
    }
}
