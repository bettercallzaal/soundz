// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title ZoundZ721
 * @notice Core NFT contract for ZoundZ music NFTs with on-chain royalties
 * @dev Implements ERC721 with upgradeable proxy pattern and ERC2981 royalties
 */
contract ZoundZ721 is 
    Initializable,
    ERC721Upgradeable,
    ERC2981Upgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    /// @notice Address that receives platform fees
    address public feeReceiver;
    
    /// @notice Total number of tokens minted
    uint256 private _tokenIdCounter;

    /// @notice Mapping from token ID to its metadata URI
    mapping(uint256 => string) private _tokenURIs;

    /// @notice Emitted when a new track is minted
    event TrackMinted(uint256 indexed tokenId, address indexed artist, string uri);

    /// @notice Emitted when fee receiver is updated
    event FeeReceiverUpdated(address indexed oldReceiver, address indexed newReceiver);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the contract
     * @param name_ Name of the NFT collection
     * @param symbol_ Symbol of the NFT collection
     * @param feeReceiver_ Address to receive platform fees
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        address feeReceiver_
    ) public initializer {
        __ERC721_init(name_, symbol_);
        __ERC2981_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        require(feeReceiver_ != address(0), "ZoundZ721: zero address fee receiver");
        feeReceiver = feeReceiver_;
    }

    /**
     * @notice Mint a new track NFT
     * @param to Address to mint the NFT to
     * @param uri IPFS URI containing track metadata
     * @return tokenId The ID of the newly minted NFT
     */
    function mintTrack(address to, string memory uri) 
        external 
        nonReentrant 
        returns (uint256) 
    {
        require(to != address(0), "ZoundZ721: mint to zero address");
        require(bytes(uri).length > 0, "ZoundZ721: empty URI");

        uint256 tokenId = _tokenIdCounter++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        // Set default royalties: 9% to artist, 1% to platform
        _setTokenRoyalty(tokenId, to, 900); // 9%
        
        emit TrackMinted(tokenId, to, uri);
        return tokenId;
    }

    /**
     * @notice Update the fee receiver address
     * @param newFeeReceiver New address to receive platform fees
     */
    function setFeeReceiver(address newFeeReceiver) external onlyOwner {
        require(newFeeReceiver != address(0), "ZoundZ721: zero address fee receiver");
        address oldReceiver = feeReceiver;
        feeReceiver = newFeeReceiver;
        emit FeeReceiverUpdated(oldReceiver, newFeeReceiver);
    }

    /**
     * @notice Get token URI
     * @param tokenId Token ID to query
     * @return URI string
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Set token URI
     * @param tokenId Token ID to set URI for
     * @param uri New URI
     */
    function _setTokenURI(uint256 tokenId, string memory uri) internal {
        require(_exists(tokenId), "ZoundZ721: URI set for nonexistent token");
        _tokenURIs[tokenId] = uri;
    }

    /**
     * @dev Override for royalty info to split between artist and platform
     * @param tokenId Token ID to query
     * @param salePrice Sale price to calculate royalty from
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        public
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        // Get artist royalty (9%)
        (address artist, uint256 artistRoyalty) = super.royaltyInfo(tokenId, salePrice);
        
        // Calculate platform fee (1%)
        uint256 platformFee = (salePrice * 100) / 10000; // 1%
        
        // Return combined royalty to artist
        return (artist, artistRoyalty + platformFee);
    }

    /**
     * @dev Required override for UUPS proxy pattern
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Required override for ERC165 support
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
