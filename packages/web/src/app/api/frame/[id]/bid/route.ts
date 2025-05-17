import { NextRequest } from 'next/server'

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
    const drop = {
      id: params.id,
      title: `Track #${params.id}`,
      artist: '0x1234...',
      coverImage: `https://picsum.photos/800/400?random=${params.id}`,
      highestBid: '0.5',
      endTime: new Date(Date.now() + 3600000).toISOString(),
    }

    // Return the bid input frame
    return Response.json({
      frames: [{
        version: 'vNext',
        image: drop.coverImage,
        title: `Place Bid on ${drop.title}`,
        buttons: [
          {
            label: 'Confirm Bid',
            action: 'post',
          }
        ],
        input: {
          text: 'Enter bid amount in ETH',
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
