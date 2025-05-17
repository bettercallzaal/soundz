// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {AuctionHouse} from "../src/AuctionHouse.sol";
import {ZoundZ721} from "../src/ZoundZ721.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract AuctionHouseGasTest is Test {
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

    function test_GasCreateAuction() public {
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);

        uint256 gasBefore = gasleft();
        vm.prank(artist);
        proxy.createAuction(tokenId);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for createAuction", gasUsed);
        assert(gasUsed < 200000); // Reasonable gas limit
    }

    function test_GasPlaceBid() public {
        // Setup auction
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        vm.deal(bidder1, 1 ether);
        uint256 gasBefore = gasleft();
        vm.prank(bidder1);
        proxy.placeBid{value: 1 ether}(tokenId, TEST_COMMENT);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for placeBid", gasUsed);
        assert(gasUsed < 150000); // Reasonable gas limit
    }

    function test_GasSettleAuction() public {
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

        uint256 gasBefore = gasleft();
        proxy.settleAuction(tokenId);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for settleAuction", gasUsed);
        assert(gasUsed < 200000); // Reasonable gas limit

        // Test withdrawal gas usage
        gasBefore = gasleft();
        vm.prank(artist);
        proxy.withdraw();
        gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for withdraw", gasUsed);
        assert(gasUsed < 50000); // Reasonable gas limit
    }

    function test_GasMultipleBids() public {
        // Setup auction
        vm.prank(artist);
        nft.transferFrom(artist, address(proxy), tokenId);
        
        vm.prank(artist);
        proxy.createAuction(tokenId);

        // Place multiple bids and track cumulative gas
        uint256 totalGasUsed;
        uint256 numBids = 5;
        uint256 bidAmount = 1 ether;

        for (uint256 i = 0; i < numBids; i++) {
            vm.deal(bidder1, bidAmount);
            uint256 gasBefore = gasleft();
            vm.prank(bidder1);
            proxy.placeBid{value: bidAmount}(tokenId, string.concat(TEST_COMMENT, " #", vm.toString(i + 1)));
            totalGasUsed += gasBefore - gasleft();
            bidAmount += 0.5 ether;
        }
        
        emit log_named_uint("Average gas per bid", totalGasUsed / numBids);
        assert(totalGasUsed / numBids < 150000); // Reasonable average gas limit
    }
}
