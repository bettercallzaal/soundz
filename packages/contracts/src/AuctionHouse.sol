// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ZoundZ721} from "./ZoundZ721.sol";

/**
 * @title AuctionHouse
 * @notice Manages 24-hour English auctions for ZoundZ NFTs
 * @dev Implements anti-sniping mechanism and split payments
 */
contract AuctionHouse is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable 
{
    /// @notice States an auction can be in
    enum AuctionState { Created, Started, Ended, Cancelled }

    /// @notice Core data for an auction
    struct Auction {
        address artist;         // Original artist/seller
        uint256 startTime;     // When auction started (0 if not started)
        uint256 endTime;       // When auction ends (0 if not started)
        uint256 highestBid;    // Current highest bid
        address highestBidder; // Address of highest bidder
        string comment;        // Comment from highest bidder
        AuctionState state;    // Current state
    }

    /// @notice Reference to ZoundZ NFT contract
    ZoundZ721 public zoundz;

    /// @notice Mapping from token ID to auction data
    mapping(uint256 => Auction) public auctions;

    /// @notice Duration of auction once started
    uint256 public constant AUCTION_DURATION = 24 hours;
    
    /// @notice Extension time when bid placed near end
    uint256 public constant TIME_EXTENSION = 5 minutes;
    
    /// @notice Window for anti-snipe extension
    uint256 public constant ANTI_SNIPE_WINDOW = 5 minutes;

    /// @notice Minimum time before artist can cancel (no bids)
    uint256 public constant MIN_CANCEL_DELAY = 7 days;

    /// @notice Emitted when new auction is created
    event AuctionCreated(uint256 indexed tokenId, address indexed artist);
    
    /// @notice Emitted when auction starts (first bid)
    event AuctionStarted(uint256 indexed tokenId, uint256 startTime, uint256 endTime);
    
    /// @notice Emitted when new bid is placed
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount, string comment);
    
    /// @notice Emitted when auction time is extended
    event AuctionExtended(uint256 indexed tokenId, uint256 newEndTime);
    
    /// @notice Emitted when auction ends
    event AuctionEnded(uint256 indexed tokenId, address winner, uint256 amount);
    
    /// @notice Emitted when auction is cancelled
    event AuctionCancelled(uint256 indexed tokenId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the contract
     * @param zoundz_ Address of ZoundZ NFT contract
     */
    function initialize(address zoundz_) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        require(zoundz_ != address(0), "AuctionHouse: zero address");
        zoundz = ZoundZ721(zoundz_);
    }

    /**
     * @notice Create new auction for a token
     * @param tokenId Token ID to auction
     */
    function createAuction(uint256 tokenId) external {
        require(msg.sender == address(zoundz), "AuctionHouse: only ZoundZ contract");
        
        auctions[tokenId] = Auction({
            artist: zoundz.ownerOf(tokenId),
            startTime: 0,
            endTime: 0,
            highestBid: 0,
            highestBidder: address(0),
            comment: "",
            state: AuctionState.Created
        });

        emit AuctionCreated(tokenId, zoundz.ownerOf(tokenId));
    }

    /**
     * @notice Place a bid on an auction
     * @param tokenId Token ID to bid on
     * @param comment Optional comment with bid
     */
    function placeBid(uint256 tokenId, string calldata comment) 
        external 
        payable
        nonReentrant 
    {
        Auction storage auction = auctions[tokenId];
        require(auction.state != AuctionState.Ended, "AuctionHouse: auction ended");
        require(auction.state != AuctionState.Cancelled, "AuctionHouse: auction cancelled");
        require(msg.value > auction.highestBid, "AuctionHouse: bid too low");

        // If first bid, start the auction
        if (auction.state == AuctionState.Created) {
            auction.startTime = block.timestamp;
            auction.endTime = block.timestamp + AUCTION_DURATION;
            auction.state = AuctionState.Started;
            emit AuctionStarted(tokenId, auction.startTime, auction.endTime);
        }

        // Check if we need to extend the auction (anti-snipe)
        if (auction.endTime - block.timestamp < ANTI_SNIPE_WINDOW) {
            auction.endTime = block.timestamp + TIME_EXTENSION;
            emit AuctionExtended(tokenId, auction.endTime);
        }

        // Refund previous bidder
        if (auction.highestBidder != address(0)) {
            (bool sent, ) = auction.highestBidder.call{value: auction.highestBid}("");
            require(sent, "AuctionHouse: failed to refund");
        }

        // Update auction state
        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;
        auction.comment = comment;

        emit BidPlaced(tokenId, msg.sender, msg.value, comment);
    }

    /**
     * @notice End auction and distribute funds
     * @param tokenId Token ID to end auction for
     */
    function endAuction(uint256 tokenId) external nonReentrant {
        Auction storage auction = auctions[tokenId];
        require(auction.state == AuctionState.Started, "AuctionHouse: not active");
        require(block.timestamp >= auction.endTime, "AuctionHouse: not ended");

        auction.state = AuctionState.Ended;

        // Calculate splits (90% artist, 10% platform)
        uint256 platformFee = (auction.highestBid * 1000) / 10000; // 10%
        uint256 artistAmount = auction.highestBid - platformFee;

        // Transfer NFT to winner
        zoundz.transferFrom(auction.artist, auction.highestBidder, tokenId);

        // Pay artist
        (bool sentArtist, ) = auction.artist.call{value: artistAmount}("");
        require(sentArtist, "AuctionHouse: failed to pay artist");

        // Pay platform
        (bool sentPlatform, ) = zoundz.feeReceiver().call{value: platformFee}("");
        require(sentPlatform, "AuctionHouse: failed to pay platform");

        emit AuctionEnded(tokenId, auction.highestBidder, auction.highestBid);
    }

    /**
     * @notice Cancel auction if no bids after delay
     * @param tokenId Token ID to cancel auction for
     */
    function artistCancel(uint256 tokenId) external {
        Auction storage auction = auctions[tokenId];
        require(msg.sender == auction.artist, "AuctionHouse: not artist");
        require(auction.state == AuctionState.Created, "AuctionHouse: already started");
        require(
            block.timestamp >= auction.startTime + MIN_CANCEL_DELAY,
            "AuctionHouse: too early"
        );

        auction.state = AuctionState.Cancelled;
        emit AuctionCancelled(tokenId);
    }

    /**
     * @dev Required override for UUPS proxy pattern
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
