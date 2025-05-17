// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {ZoundZ721} from "../src/ZoundZ721.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract ZoundZ721SecurityTest is Test {
    ZoundZ721 public implementation;
    ZoundZ721 public proxy;
    
    address public owner = address(0x1);
    address public artist = address(0x2);
    address public attacker = address(0x3);
    address public feeReceiver = address(0x4);
    
    function setUp() public {
        // Deploy implementation
        implementation = new ZoundZ721();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            ZoundZ721.initialize.selector,
            owner,
            feeReceiver
        );
        
        ERC1967Proxy proxyContract = new ERC1967Proxy(
            address(implementation),
            initData
        );
        
        proxy = ZoundZ721(address(proxyContract));
    }
    
    function test_RevertWhen_UnauthorizedInitialize() public {
        // Deploy new implementation to try to initialize again
        ZoundZ721 newImplementation = new ZoundZ721();
        
        vm.expectRevert("InvalidInitialization()");
        newImplementation.initialize(owner, feeReceiver);
    }
    
    function test_RevertWhen_ReentrantMint() public {
        // Deploy malicious receiver
        MaliciousReceiver malicious = new MaliciousReceiver(address(proxy));

        // Try to mint with malicious receiver
        vm.expectRevert("ReentrancyGuardReentrantCall()");
        proxy.mintTrack(address(malicious), "ipfs://test");
        vm.stopPrank();
    }
    
    function test_RevertWhen_UnauthorizedUpgrade() public {
        ZoundZ721 newImplementation = new ZoundZ721();
        
        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", attacker));
        proxy.upgradeToAndCall(address(newImplementation), "");
        vm.stopPrank();
    }
    
    function test_RevertWhen_InvalidRoyaltyQuery() public {
        vm.startPrank(artist);
        uint256 tokenId = proxy.mintTrack(artist, "ipfs://test");
        vm.stopPrank();
        
        vm.expectRevert("ERC721: invalid token ID");
        proxy.royaltyInfo(tokenId + 1, 1000);
    }
    
    function test_RevertWhen_ZeroFeeReceiverInitialize() public {
        ZoundZ721 newImplementation = new ZoundZ721();
        
        // Test initializing with zero fee receiver
        vm.expectRevert(bytes("InvalidInitialization()"));
        newImplementation.initialize(owner, address(0));
    }

    function test_RevertWhen_ZeroOwnerInitialize() public {
        ZoundZ721 newImplementation = new ZoundZ721();
        
        // Test initializing with zero owner
        vm.expectRevert(bytes("InvalidInitialization()"));
        newImplementation.initialize(address(0), feeReceiver);
    }
}

contract MaliciousReceiver {
    ZoundZ721 public target;
    bool public attacked;
    
    constructor(address _target) {
        target = ZoundZ721(_target);
    }
    
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) external returns (bytes4) {
        if (!attacked) {
            attacked = true;
            // Try to reenter
            target.mintTrack(address(this), "ipfs://evil");
        }
        return this.onERC721Received.selector;
    }
}
