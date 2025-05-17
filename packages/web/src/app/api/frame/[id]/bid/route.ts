import { NextRequest } from 'next/server'
import { gql } from '@apollo/client'
import { client } from '@/lib/apollo'
import type { Auction } from '@/lib/types'

async function getAuctionById(id: string): Promise<Auction | null> {
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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()

    // Validate the Frame request
    const validateRes = await fetch('https://api.neynar.com/v2/farcaster/frame/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY!
      },
      body: JSON.stringify(body)
    })

    const validationData = await validateRes.json()
    if (!validationData.valid) {
      return Response.json({
        frames: [{
          version: 'vNext',
          image: `${process.env.NEXT_PUBLIC_API_URL}/error.png`,
          title: 'Error',
          description: validationData.message || 'Invalid frame request'
        }]
      }, { status: 400 })
    }

    // Get auction data
    const auction = await getAuctionById(params.id)
    if (!auction) {
      return Response.json({
        frames: [{
          version: 'vNext',
          image: `${process.env.NEXT_PUBLIC_API_URL}/not-found.png`,
          title: '🔍 Drop Not Found',
          description: 'This drop no longer exists',
          buttons: [{
            label: '🎵 Browse Other Drops',
            action: 'link',
            target: process.env.NEXT_PUBLIC_API_URL
          }]
        }]
      })
    }

    // Calculate time remaining
    const endTime = new Date(auction.endTime)
    const timeRemaining = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000 / 60))
    
    if (timeRemaining <= 0) {
      return Response.json({
        frames: [{
          version: 'vNext',
          image: `${process.env.NEXT_PUBLIC_API_URL}/api/frame/${params.id}/image`,
          title: '⏰ Auction Ended',
          description: `Winning bid: ${auction.highestBid} ETH`,
          buttons: [{
            label: '🎵 Browse Other Drops',
            action: 'link',
            target: process.env.NEXT_PUBLIC_API_URL
          }]
        }]
      })
    }

    // Return bid input frame
    return Response.json({
      frames: [{
        version: 'vNext',
        image: `${process.env.NEXT_PUBLIC_API_URL}/api/frame/${params.id}/image`,
        title: `Current Bid: ${auction.highestBid} ETH`,
        description: `⏰ ${timeRemaining} minutes remaining`,
        input: {
          text: 'Enter bid amount in ETH',
          placeholder: '0.1'
        },
        buttons: [{
          label: '💰 Place Bid',
          action: 'post',
          target: `${process.env.NEXT_PUBLIC_API_URL}/api/frame/${params.id}/confirm`
        }]
      }]
    })
  } catch (error) {
    console.error('Error in bid route:', error)
    return Response.json({
      frames: [{
        version: 'vNext',
        image: `${process.env.NEXT_PUBLIC_API_URL}/error.png`,
        title: 'Error',
        description: 'Something went wrong'
      }]
    }, { status: 500 })
  }
}
