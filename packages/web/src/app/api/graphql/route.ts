import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await fetch(
      `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_GRAPH_API_KEY}/subgraphs/id/S9ihna8D733WTEShJ4k2HBt6URf9MdkF5FYPrZzRF8gZ`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY}`
        },
        body: JSON.stringify(body)
      }
    )

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('GraphQL proxy error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
