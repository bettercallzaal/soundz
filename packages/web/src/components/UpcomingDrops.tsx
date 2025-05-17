'use client'

import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import type { Auction } from '@/lib/types'
import { CountdownTimer } from './CountdownTimer'

const GET_UPCOMING_AUCTIONS = gql`
  query GetUpcomingAuctions {
    auctions(
      first: 3
      orderBy: startTime
      orderDirection: asc
      where: { status: CREATED }
    ) {
      id
      tokenId
      title
      description
      artist
      coverImage
      startTime
      endTime
    }
  }
`

export function UpcomingDrops() {
  const { data, loading, error } = useQuery<{ auctions: Auction[] }>(GET_UPCOMING_AUCTIONS)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-900 rounded-lg overflow-hidden">
            <div className="bg-gray-800 h-48 rounded-t-lg"></div>
            <div className="p-4 space-y-3">
              <div className="h-6 bg-gray-800 rounded w-3/4"></div>
              <div className="h-4 bg-gray-800 rounded w-1/2"></div>
              <div className="h-12 bg-gray-800 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/50 text-red-200 p-4 rounded-lg">
        <p className="font-medium">Error loading upcoming drops</p>
        <p className="text-sm text-red-300 mt-1">{error.message}</p>
      </div>
    )
  }

  if (!data?.auctions.length) {
    return (
      <div className="bg-gray-900/50 text-gray-400 p-6 rounded-lg text-center">
        <p className="text-lg font-medium">No Upcoming Drops</p>
        <p className="mt-2">Check back soon for new auctions!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {data.auctions.map((auction) => (
        <div
          key={auction.id}
          className="group bg-gray-900 rounded-lg overflow-hidden"
        >
          <div className="relative">
            <img
              src={auction.coverImage}
              alt={auction.title}
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          </div>
          <div className="p-6">
            <h3 className="font-semibold text-xl mb-2">{auction.title}</h3>
            <p className="text-gray-400 mb-4">By {auction.artist}</p>
            <div className="py-3 border-t border-gray-800">
              <p className="text-sm text-gray-400 mb-2">Starts in</p>
              <CountdownTimer endTime={Number(auction.startTime)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
