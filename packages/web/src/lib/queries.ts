import { gql } from '@apollo/client'

export const GET_PAST_AUCTIONS = gql`
  query GetPastAuctions {
    auctions(
      first: 6
      orderBy: endTime
      orderDirection: desc
      where: { status: ENDED }
    ) {
      id
      tokenId
      title
      description
      artist
      coverImage
      startTime
      endTime
      highestBid
      highestBidder
      bids(orderBy: timestamp, orderDirection: desc, first: 1) {
        id
        bidder
        amount
        timestamp
      }
    }
  }
`

export const GET_LIVE_AUCTION = gql`
  query GetLiveAuction {
    auctions(
      first: 1
      orderBy: startTime
      orderDirection: desc
      where: { status: STARTED }
    ) {
      id
      tokenId
      title
      description
      artist
      coverImage
      startTime
      endTime
      highestBid
      highestBidder
      bids(orderBy: timestamp, orderDirection: desc) {
        id
        bidder
        amount
        timestamp
        comment
      }
    }
  }
`



export const GET_AUCTION_BIDS = gql`
  query GetAuctionBids($auctionId: String!) {
    bids(
      where: { auction: $auctionId }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      bidder
      amount
      timestamp
      comment
    }
  }
`
