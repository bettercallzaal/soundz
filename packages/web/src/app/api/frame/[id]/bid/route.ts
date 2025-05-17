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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // Validate the Farcaster Frame message
    const validateRes = await fetch('https://api.neynar.com/v2/farcaster/frame/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY!
      },
      body: JSON.stringify(body)
    })

    const validation = await validateRes.json()
    
    if (!validation.valid) {
      return Response.json(
        { error: 'Invalid frame message' },
        { status: 400 }
      )
    }

    // Get the current auction data
    const auction = await getAuctionById(params.id)
    if (!auction) {
      return Response.json({
        frames: [{
          version: 'vNext',
          image: 'https://soundz-web-111-kdiu4r6g2-bettercallzaals-projects.vercel.app/404.png',
          aspectRatio: '1:1',
          title: '🔍 Drop Not Found',
          description: 'Check out other available drops',
          buttons: [{
            label: '🎵 Browse',
            action: 'link',
            target: process.env.NEXT_PUBLIC_API_URL
          }]
        }]
      })
    }

    // Calculate time remaining
    const endTime = new Date(parseInt(auction.endTime) * 1000)
    const timeRemaining = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000 / 60))
    
    if (timeRemaining <= 0) {
      return Response.json({
        frames: [{
          version: 'vNext',
          image: auction.coverImage,
          aspectRatio: '1:1',
          title: '🏁 Auction Complete',
          description: `${auction.title}\nSold for ${parseFloat(auction.highestBid) / 1e18} ETH`,
          buttons: [{
            label: '🏆 Results',
            action: 'link',
            target: `${process.env.NEXT_PUBLIC_API_URL}/drop/${params.id}`
          }]
        }]
      })
    }

    // Format current bid
    const currentBid = parseFloat(auction.highestBid) / 1e18
    const minBid = currentBid * 1.1 // 10% higher than current bid

    // Return the bid input frame
    return Response.json({
      frames: [{
        version: 'vNext',
        image: auction.coverImage,
        aspectRatio: '1:1',
        title: auction.title.length > 30 ? auction.title.slice(0, 27) + '...' : auction.title,
        description: `by ${auction.artist}\n💰 ${currentBid.toFixed(3)} ETH | ⏱️ ${timeRemaining}m left`,
        buttons: [
          {
            label: '💫 Bid',
            action: 'post'
          },
          {
            label: '🎵 View',
            action: 'link',
            target: `${process.env.NEXT_PUBLIC_API_URL}/drop/${params.id}`
          }
        ],
        input: {
          text: `Min: ${minBid.toFixed(3)} ETH`
        },
        postUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/frame/${params.id}/confirm`
      }]
    })
  } catch (error) {
    console.error('Error handling bid:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
