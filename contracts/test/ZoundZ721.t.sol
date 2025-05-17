// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {ZoundZ721} from "../src/ZoundZ721.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";


contract ZoundZ721Test is Test {
    ZoundZ721 public implementation;
    ZoundZ721 public proxy;
    
    address public owner = makeAddr("owner");
    address public feeReceiver = makeAddr("feeReceiver");
    address public artist = makeAddr("artist");
    string public constant TEST_URI = "ipfs://QmTest";

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

    function test_Initialize() public {
        assertEq(proxy.owner(), owner);
        assertEq(proxy.feeReceiver(), feeReceiver);
        assertEq(proxy.name(), "ZoundZ");
        assertEq(proxy.symbol(), "ZNDZ");
    }

    function test_MintTrack() public {
        vm.startPrank(artist);
        uint256 tokenId = proxy.mintTrack(artist, TEST_URI);
        vm.stopPrank();

        assertEq(proxy.ownerOf(tokenId), artist);
        assertEq(proxy.tokenURI(tokenId), TEST_URI);
        assertEq(proxy.artistOf(tokenId), artist);

        (address receiver, uint256 amount) = proxy.royaltyInfo(tokenId, 10000);

        // Platform should get 1% royalties
        assertEq(receiver, feeReceiver);
        assertEq(amount, 100);
    }

    function test_RevertWhen_MintToZeroAddress() public {
        vm.expectRevert("Invalid recipient");
        proxy.mintTrack(address(0), TEST_URI);
    }

    function test_RevertWhen_EmptyURI() public {
        vm.expectRevert("Empty URI");
        proxy.mintTrack(artist, "");
    }

    function test_RevertWhen_TokenDoesNotExist() public {
        vm.expectRevert("Token does not exist");
        proxy.tokenURI(999);

        vm.expectRevert("Token does not exist");
        proxy.artistOf(999);
    }

    function test_UpgradeToAndCall() public {
        ZoundZ721 newImplementation = new ZoundZ721();
        
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        proxy.upgradeToAndCall(address(newImplementation), "");
    }

    function test_RevertWhen_NotOwnerUpgrades() public {
        ZoundZ721 newImplementation = new ZoundZ721();
        
        vm.prank(artist);
        bytes memory expectedError = abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", artist);
        vm.expectRevert(expectedError);
        proxy.upgradeToAndCall(address(newImplementation), "");
    }
}
