export const AUCTION_HOUSE_ABI = [
  {
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "comment", type: "string" }
    ],
    name: "placeBid",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "endAuction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "artistCancel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "bidder", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "comment", type: "string" }
    ],
    name: "BidPlaced",
    type: "event"
  }
] as const

export const ZOUNDZ_NFT_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "uri", type: "string" }
    ],
    name: "mintTrack",
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  }
] as const
