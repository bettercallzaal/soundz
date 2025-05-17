'use client'

import { formatDistanceToNow } from 'date-fns'
import type { Bid } from '@/lib/types'

interface BidHistoryProps {
  bids: Bid[]
}

export function BidHistory({ bids }: BidHistoryProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Bid History</h3>
      <div className="space-y-2">
        {bids.length === 0 ? (
          <p className="text-gray-400">No bids yet</p>
        ) : (
          bids.map((bid) => (
            <div key={bid.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
              <div>
                <p className="font-medium truncate">{bid.bidder.slice(0, 6)}...{bid.bidder.slice(-4)}</p>
                <p className="text-sm text-gray-400">{formatDistanceToNow(Number(bid.timestamp) * 1000)} ago</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{parseFloat(bid.amount) / 1e18} ETH</p>
                {bid.comment && (
                  <p className="text-sm text-gray-400 truncate max-w-[200px]">{bid.comment}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
