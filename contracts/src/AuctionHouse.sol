// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./ZoundZ721.sol";

/**
 * @title AuctionHouse
 * @dev Manages 24-hour English auctions for ZoundZ NFTs
 */
contract AuctionHouse is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable
{
    /// @dev Auction struct containing all relevant information
    struct Auction {
        address artist;
        uint256 startTime;
        uint256 endTime;
        uint256 highestBid;
        address highestBidder;
        string comment;
        bool settled;
        bool cancelled;
    }

    /// @dev The ZoundZ NFT contract
    ZoundZ721 public zoundzNFT;

    /// @dev Platform fee receiver
    address public feeReceiver;

    /// @dev Role definitions
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    /// @dev Mapping of pending withdrawals
    mapping(address => uint256) private _pendingWithdrawals;

    /// @dev Pause flags for different actions
    bool public biddingPaused;
    bool public settlementPaused;
    bool public auctionCreationPaused;

    /// @dev Time delay for unpausing (24 hours)
    uint256 public constant UNPAUSE_DELAY = 24 hours;

    /// @dev Timestamp when unpausing can occur
    uint256 public unpauseAfter;

    /// @dev Platform fee in basis points (10000 = 100%)
    uint256 public constant PLATFORM_FEE = 250; // 2.5%

    /// @dev Minimum auction duration (24 hours)
    uint256 public constant MIN_DURATION = 24 hours;

    /// @dev Anti-snipe duration (5 minutes)
    uint256 public constant ANTI_SNIPE_DURATION = 5 minutes;

    /// @dev Mapping from token ID to auction
    mapping(uint256 => Auction) public auctions;

    /// @dev Events
    event AuctionCreated(uint256 indexed tokenId, address indexed artist, uint256 startTime);
    event AuctionStarted(
        uint256 indexed tokenId,
        uint256 startTime,
        uint256 endTime
    );
    event BiddingPaused(address indexed pauser);
    event SettlementPaused(address indexed pauser);
    event AuctionCreationPaused(address indexed pauser);
    event BiddingUnpaused(address indexed unpauser);
    event SettlementUnpaused(address indexed unpauser);
    event AuctionCreationUnpaused(address indexed unpauser);
    event UnpauseInitiated(address indexed initiator, uint256 effectiveTime);
    event PaymentWithdrawn(address indexed payee, uint256 amount);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount, string comment);
    event AuctionExtended(uint256 indexed tokenId, uint256 newEndTime);
    event AuctionSettled(uint256 indexed tokenId, address indexed winner, uint256 amount);
    event AuctionCancelled(uint256 indexed tokenId);
    event Upgraded(address indexed implementation);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address _feeReceiver,
        address _zoundzNFT
    ) public initializer {
        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __AccessControl_init();

        feeReceiver = _feeReceiver;
        zoundzNFT = ZoundZ721(_zoundzNFT);

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);
        _grantRole(UPGRADER_ROLE, initialOwner);
        _grantRole(FEE_MANAGER_ROLE, initialOwner);
    }

    /**
     * @dev Creates a new auction for a token
     * @param tokenId The ID of the token to auction
     */
    function createAuction(uint256 tokenId) external {
        require(!auctionCreationPaused, "Auction creation is paused");
        require(msg.sender == zoundzNFT.artistOf(tokenId), "Not token artist");
        require(zoundzNFT.ownerOf(tokenId) == address(this), "Token not transferred");
        require(!_auctionExists(tokenId), "Auction already exists");
        require(address(zoundzNFT).code.length > 0, "NFT contract not deployed");

        auctions[tokenId] = Auction({
            artist: msg.sender,
            startTime: block.timestamp,
            endTime: block.timestamp + MIN_DURATION,
            highestBid: 0,
            highestBidder: address(0),
            comment: "",
            settled: false,
            cancelled: false
        });

        emit AuctionCreated(tokenId, msg.sender, block.timestamp);
    }

    /**
     * @dev Places a bid on an auction
     * @param tokenId The ID of the token to bid on
     * @param comment Optional comment with the bid
     */
    function placeBid(uint256 tokenId, string calldata comment) external payable nonReentrant {
        require(!biddingPaused, "Bidding is paused");
        require(msg.value > 0, "Zero bid not allowed");
        require(msg.sender != address(0), "Invalid bidder address");
        if (msg.sender.code.length > 0) {
            try IERC721Receiver(msg.sender).onERC721Received(msg.sender, address(0), tokenId, "") returns (bytes4 retval) {
                require(retval == IERC721Receiver.onERC721Received.selector, "Bidder cannot receive NFT");
            } catch {
                revert("Bidder cannot receive NFT");
            }
        }

        Auction storage auction = auctions[tokenId];
        require(_auctionExists(tokenId), "Auction does not exist");
        require(!auction.settled && !auction.cancelled, "Auction ended");
        require(block.timestamp >= auction.startTime, "Auction not started");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value > auction.highestBid, "Bid too low");

        // Check if we need to extend the auction (anti-snipe)
        if (block.timestamp > auction.endTime - ANTI_SNIPE_DURATION) {
            auction.endTime = block.timestamp + ANTI_SNIPE_DURATION;
            emit AuctionExtended(tokenId, auction.endTime);
        }

        // Refund the previous highest bidder
        if (auction.highestBidder != address(0)) {
            (bool success, ) = auction.highestBidder.call{value: auction.highestBid}("");
            require(success, "Refund failed");
        }

        // Update auction state
        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;
        auction.comment = comment;

        emit BidPlaced(tokenId, msg.sender, msg.value, comment);
    }

    /**
     * @dev Settles an auction by distributing funds and transferring the NFT
     * @param tokenId The ID of the token to settle
     */
    function settleAuction(uint256 tokenId) external nonReentrant {
        require(!settlementPaused, "Settlement is paused");
        Auction storage auction = auctions[tokenId];
        require(_auctionExists(tokenId), "Auction does not exist");
        require(auction.endTime <= block.timestamp, "Auction still active");
        require(auction.highestBidder != address(0), "No bids placed");
        require(auction.artist != address(0), "Invalid artist address");
        require(feeReceiver != address(0), "Invalid fee receiver");
        require(address(this).balance >= auction.highestBid, "Insufficient contract balance");

        // Transfer NFT to winner
        zoundzNFT.safeTransferFrom(address(this), auction.highestBidder, tokenId);

        // Calculate and distribute fees
        uint256 platformFee = (auction.highestBid * PLATFORM_FEE) / 10000;
        uint256 artistAmount = auction.highestBid - platformFee;

        // Queue payments for withdrawal
        _pendingWithdrawals[auction.artist] += artistAmount;
        _pendingWithdrawals[feeReceiver] += platformFee;

        emit AuctionSettled(tokenId, auction.highestBidder, auction.highestBid);

        delete auctions[tokenId];
    }

    /**
     * @dev Allows the artist to cancel an auction if no bids have been placed and 7 days have passed
     * @param tokenId The ID of the token to cancel
     */
    function artistCancel(uint256 tokenId) external {
        Auction storage auction = auctions[tokenId];
        require(_auctionExists(tokenId), "Auction does not exist");
        require(!auction.settled && !auction.cancelled, "Auction already ended");
        require(msg.sender == auction.artist, "Not the artist");
        require(auction.highestBidder == address(0), "Bids already placed");
        require(block.timestamp >= auction.startTime + 7 days, "Too early to cancel");

        auction.cancelled = true;
        zoundzNFT.safeTransferFrom(address(this), auction.artist, tokenId);

        emit AuctionCancelled(tokenId);
    }

    /**
     * @dev Checks if an auction exists for a token
     */
    function _auctionExists(uint256 tokenId) internal view returns (bool) {
        return auctions[tokenId].artist != address(0);
    }

    /**
     * @dev Pause the contract
     */
    function pauseBidding() external onlyRole(PAUSER_ROLE) {
        biddingPaused = true;
        emit BiddingPaused(msg.sender);
    }

    function pauseSettlement() external onlyRole(PAUSER_ROLE) {
        settlementPaused = true;
        emit SettlementPaused(msg.sender);
    }

    function pauseAuctionCreation() external onlyRole(PAUSER_ROLE) {
        auctionCreationPaused = true;
        emit AuctionCreationPaused(msg.sender);
    }

    function initiateUnpause() external onlyRole(PAUSER_ROLE) {
        unpauseAfter = block.timestamp + UNPAUSE_DELAY;
        emit UnpauseInitiated(msg.sender, unpauseAfter);
    }

    function unpauseBidding() external onlyRole(PAUSER_ROLE) {
        require(unpauseAfter != 0, "Unpause not initiated");
        require(block.timestamp >= unpauseAfter, "Unpause delay not elapsed");
        biddingPaused = false;
        emit BiddingUnpaused(msg.sender);
    }

    function unpauseSettlement() external onlyRole(PAUSER_ROLE) {
        require(unpauseAfter != 0, "Unpause not initiated");
        require(block.timestamp >= unpauseAfter, "Unpause delay not elapsed");
        settlementPaused = false;
        emit SettlementUnpaused(msg.sender);
    }

    function unpauseAuctionCreation() external onlyRole(PAUSER_ROLE) {
        require(unpauseAfter != 0, "Unpause not initiated");
        require(block.timestamp >= unpauseAfter, "Unpause delay not elapsed");
        auctionCreationPaused = false;
        emit AuctionCreationUnpaused(msg.sender);
    }

    /**
     * @dev Get the pending withdrawal amount for an address
     */
    function pendingWithdrawals(address payee) external view returns (uint256) {
        return _pendingWithdrawals[payee];
    }

    /**
     * @dev Withdraw accumulated balance
     */
    function withdraw() external nonReentrant {
        uint256 amount = _pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");

        // Zero the pending refund before sending to prevent re-entrancy attacks
        _pendingWithdrawals[msg.sender] = 0;

        // Transfer funds
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit PaymentWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Required by UUPS upgradeable pattern
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {
        emit Upgraded(newImplementation);
    }
}
