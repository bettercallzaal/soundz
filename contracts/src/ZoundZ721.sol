// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title ZoundZ721
 * @dev ERC721 contract for ZoundZ music NFTs with royalty support
 */
contract ZoundZ721 is 
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    ReentrancyGuardUpgradeable,
    IERC2981,
    OwnableUpgradeable,
    UUPSUpgradeable 
{
    /// @dev Token ID counter
    uint256 private _tokenIdCounter;



    /// @dev Mapping from token ID to artist address
    mapping(uint256 => address) private _artists;

    /// @dev Fee receiver address for platform fees
    address public feeReceiver;

    /// @dev Royalty info for each token
    struct RoyaltyInfo {
        address receiver;
        uint96 royaltyFraction;
    }
    mapping(uint256 => RoyaltyInfo[]) private _royalties;

    /// @dev Events
    event TrackMinted(uint256 indexed tokenId, address indexed artist, string uri);
    event Upgraded(address indexed implementation);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    error InvalidFeeReceiver();

    function initialize(address initialOwner, address _feeReceiver) public initializer {
        if (initialOwner == address(0)) revert OwnableInvalidOwner(address(0));
        if (_feeReceiver == address(0)) revert InvalidFeeReceiver();

        __ERC721_init("ZoundZ", "ZNDZ");
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        feeReceiver = _feeReceiver;
    }

    /**
     * @dev Mints a new track NFT
     * @param to The address that will own the NFT
     * @param uri The IPFS URI containing track metadata
     * @return tokenId The ID of the newly minted token
     */
    function mintTrack(address to, string calldata uri) external nonReentrant returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(bytes(uri).length > 0, "Empty URI");

        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _artists[tokenId] = to;

        // Set default royalties: 9% to artist, 1% to platform
        _royalties[tokenId].push(RoyaltyInfo(to, 900)); // 9%
        _royalties[tokenId].push(RoyaltyInfo(feeReceiver, 100)); // 1%

        emit TrackMinted(tokenId, to, uri);
        return tokenId;
    }

    /**
     * @dev Returns the artist address for a given token ID
     */
    function artistOf(uint256 tokenId) external view returns (address) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _artists[tokenId];
    }

    /**
     * @dev Returns the token URI for a given token ID
     */
    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) {
            revert("Token does not exist");
        }
        return super.tokenURI(tokenId);
    }


    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(IERC165, ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC2981-royaltyInfo}.
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        require(_ownerOf(tokenId) != address(0), "ERC721: invalid token ID");
        RoyaltyInfo[] storage royalties = _royalties[tokenId];
        require(royalties.length > 0, "No royalties set");

        // Return platform royalties
        receiver = royalties[1].receiver;
        royaltyAmount = (salePrice * royalties[1].royaltyFraction) / 10000;
    }

    /**
     * @dev Required by UUPS upgradeable pattern
     */
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {
        emit Upgraded(newImplementation);
    }
}
