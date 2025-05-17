import { NextResponse } from 'next/server'
import mockData from '@/data/mockAuctions.json'

export async function POST(request: Request) {
  try {
    const { query } = await request.json()
    
    // Mock GraphQL query handling
    if (query.includes('GetLiveAuction')) {
      const liveAuction = mockData.auctions.find(auction => auction.status === 'STARTED')
      return NextResponse.json({ data: { auctions: liveAuction ? [liveAuction] : [] } })
    }

    if (query.includes('GetPastAuctions')) {
      const pastAuctions = mockData.auctions.filter(auction => auction.status === 'ENDED')
      return NextResponse.json({ data: { auctions: pastAuctions } })
    }

    if (query.includes('GetUpcomingAuctions')) {
      const upcomingAuctions = mockData.auctions.filter(auction => auction.status === 'CREATED')
      return NextResponse.json({ data: { auctions: upcomingAuctions } })
    }

    return NextResponse.json({ data: { auctions: [] } })
  } catch (error) {
    console.error('Mock API error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
