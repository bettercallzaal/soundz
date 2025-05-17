'use client'

import Link from 'next/link'
import { useQuery } from '@apollo/client'
import { GET_PAST_AUCTIONS } from '@/lib/queries'
import type { Auction } from '@/lib/types'

export function PastDrops() {
  const { data, loading, error } = useQuery<{ auctions: Auction[] }>(GET_PAST_AUCTIONS)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-900 rounded-lg overflow-hidden">
            <div className="bg-gray-800 h-64 rounded-t-lg"></div>
            <div className="p-4 space-y-3">
              <div className="h-6 bg-gray-800 rounded w-3/4"></div>
              <div className="h-4 bg-gray-800 rounded w-1/2"></div>
              <div className="h-4 bg-gray-800 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/50 text-red-200 p-4 rounded-lg">
        <p className="font-medium">Error loading past auctions</p>
        <p className="text-sm text-red-300 mt-1">{error.message}</p>
      </div>
    )
  }

  if (!data?.auctions.length) {
    return (
      <div className="bg-gray-900/50 text-gray-400 p-6 rounded-lg text-center">
        <p className="text-lg font-medium">No Past Drops Yet</p>
        <p className="mt-2">Check back soon for completed auctions!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {data.auctions.map((auction) => (
        <Link 
          key={auction.id} 
          href={`/drop/${auction.id}`}
          className="group block bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
        >
          <div className="relative">
            <img
              src={auction.coverImage}
              alt={auction.title}
              className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          </div>
          <div className="p-6">
            <h3 className="font-semibold text-xl mb-2 group-hover:text-blue-400 transition-colors">
              {auction.title}
            </h3>
            <p className="text-gray-400 mb-4">By {auction.artist}</p>
            <div className="flex items-center justify-between py-3 border-t border-gray-800">
              <div>
                <p className="text-sm text-gray-400">Sold for</p>
                <p className="text-lg font-semibold">{parseFloat(auction.highestBid) / 1e18} ETH</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Winner</p>
                <p className="font-medium text-sm">
                  {auction.highestBidder.slice(0, 6)}...{auction.highestBidder.slice(-4)}
                </p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
