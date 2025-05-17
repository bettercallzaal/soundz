import { gql } from '@apollo/client'
import { getClient } from './apollo'
import type { Auction } from './types'

export async function getAuctionById(id: string): Promise<Auction | null> {
  const client = getClient()
  
  try {
    const { data } = await client.query({
      query: gql`
        query GetAuction($id: ID!) {
          auctions(where: { id: $id }) {
            id
            tokenId
            title
            description
            artist
            coverImage
            audioUrl
            highestBid
            endTime
            bids {
              id
              amount
              bidder
              timestamp
              comment
            }
          }
        }
      `,
      variables: { id }
    })

    return data.auctions[0] || null
  } catch (error) {
    console.error('Error fetching auction:', error)
    return null
  }
}
