export interface Auction {
  id: string
  tokenId: string
  artist: string
  title: string
  description: string
  coverImage: string
  audioUrl: string
  startTime: string
  endTime: string
  highestBid: string
  highestBidder: string
  status: 'CREATED' | 'STARTED' | 'ENDED' | 'CANCELLED'
  bids: Bid[]
}

export interface Bid {
  id: string
  bidder: string
  amount: string
  timestamp: string
  comment?: string
}

export interface AuctionBid {
  id: string
  auction: Auction
  bidder: string
  amount: string
  timestamp: string
  comment?: string
}

export interface AuctionResponse {
  auctions: Auction[]
}

export interface SingleAuctionResponse {
  auction: Auction
}

export interface AuctionBid {
  id: string
  auction: Auction
  bidder: string
  amount: string
  timestamp: string
  comment?: string
}
