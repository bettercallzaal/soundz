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

    // Get the bid amount from input
    const bidAmount = parseFloat(body.untrustedData.inputText)
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return Response.json({
        frames: [{
          version: 'vNext',
          image: `${process.env.NEXT_PUBLIC_API_URL}/error.png`,
          title: 'Invalid Bid',
          description: 'Please enter a valid bid amount',
          buttons: [{
            label: '↩️ Try Again',
            action: 'post',
            target: `${process.env.NEXT_PUBLIC_API_URL}/api/frame/${params.id}/bid`
          }]
        }]
      })
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

    // Check if auction ended
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

    // Check if bid is high enough
    const currentBid = parseFloat(auction.highestBid)
    const minBid = currentBid * 1.1 // 10% higher than current bid
    if (bidAmount < minBid) {
      return Response.json({
        frames: [{
          version: 'vNext',
          image: `${process.env.NEXT_PUBLIC_API_URL}/api/frame/${params.id}/image`,
          title: 'Bid Too Low',
          description: `Minimum bid: ${minBid.toFixed(3)} ETH`,
          buttons: [{
            label: '↩️ Try Again',
              target: `${process.env.NEXT_PUBLIC_API_URL}/api/frame/${params.id}/bid`
            }
          ]
        }]
      })
    }

    // Here you would trigger the bid transaction using the user's connected wallet
    // For now, we'll just show a success message
    return Response.json({
      frames: [{
        version: 'vNext',
        image: 'https://soundz-web-111-kdiu4r6g2-bettercallzaals-projects.vercel.app/success.png',
        aspectRatio: '1:1',
        title: '🎉 Bid Confirmed!',
        description: `Your bid: ${bidAmount.toFixed(3)} ETH`,
        buttons: [
          {
            label: '🎵 View Drop',
            action: 'link',
            target: `${process.env.NEXT_PUBLIC_API_URL}/drop/${params.id}`
          },
          {
            label: '🔙 New Bid',
            action: 'post',
            target: `${process.env.NEXT_PUBLIC_API_URL}/api/frame/${params.id}/bid`
          }
        ]
      }]
    })
  } catch (error) {
    console.error('Error handling bid confirmation:', error)
    return Response.json({
      frames: [{
        version: 'vNext',
        image: 'https://soundz-web-111-kdiu4r6g2-bettercallzaals-projects.vercel.app/error.png',
        title: 'Error Processing Bid',
        description: 'Something went wrong. Please try again.',
        buttons: [{
          label: '🔙 Go Back',
          action: 'post',
          target: `${process.env.NEXT_PUBLIC_API_URL}/api/frame/${params.id}/bid`
        }]
      }]
    })
  }
}
