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

    const bidAmount = parseFloat(body.untrustedData.inputText)
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return Response.json({
        frames: [{
          version: 'vNext',
          image: `https://picsum.photos/800/400?random=${params.id}`,
          title: 'Invalid Bid Amount',
          buttons: [
            {
              label: 'Try Again',
              action: 'post',
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
        image: `https://picsum.photos/800/400?random=${params.id}`,
        title: `Bid Placed: ${bidAmount} ETH`,
        buttons: [
          {
            label: 'View Drop',
            action: 'link',
            target: `${process.env.NEXT_PUBLIC_API_URL}/drop/${params.id}`
          }
        ]
      }]
    })
  } catch (error) {
    console.error('Error handling bid confirmation:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
