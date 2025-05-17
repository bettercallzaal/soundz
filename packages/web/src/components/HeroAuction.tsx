'use client'

import { useAccount, useConnect, useWriteContract } from 'wagmi'
import { useState } from 'react'
import { parseEther } from 'viem'
import { customBase } from '@/lib/chains'
import { AUCTION_HOUSE_ABI } from '@/lib/contracts'
import { useQuery } from '@apollo/client'
import { GET_LIVE_AUCTION } from '@/lib/queries'
import type { Auction } from '@/lib/types'
import { CountdownTimer } from './CountdownTimer'
import { BidHistory } from './BidHistory'
import { AudioPlayer } from './AudioPlayer'

export function HeroAuction() {
  const { isConnected, address } = useAccount()
  const { connect, connectors } = useConnect()
  const [bidAmount, setBidAmount] = useState('')
  const [comment, setComment] = useState('')

  const { writeContract, isPending, isError, error: writeError } = useWriteContract()

  const { data, loading, error, refetch } = useQuery<{ auctions: Auction[] }>(GET_LIVE_AUCTION)

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-800 rounded-lg p-8">
        <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 p-8">
        Error loading auction data
      </div>
    )
  }

  const auction = data?.auctions[0]

  if (!auction) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">No Active Auctions</h2>
        <p className="text-gray-400">Check back soon for new drops!</p>
      </div>
    )
  }

  const handleAuctionEnd = () => {
    // Refetch the auction data when the timer ends
    refetch()
  }

  const handleBid = () => {
    if (!bidAmount || !auction || !address) return

    writeContract({
      abi: AUCTION_HOUSE_ABI,
      address: process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS as `0x${string}`,
      functionName: 'placeBid',
      args: [BigInt(auction.tokenId), comment],
      value: parseEther(bidAmount),
      chain: customBase,
      account: address
    })
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 animate-pulse">
        <div className="h-64 bg-gray-800 rounded-lg"></div>
      </div>
    )
  }

  if (error || !auction) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <p className="text-red-500">No active auctions found</p>
      </div>
    )
  }

  const endTime = new Date(parseInt(auction.endTime) * 1000)
  const timeRemaining = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000 / 60))

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Image and Audio */}
        <div className="space-y-4">
          <img
            src={auction.coverImage}
            alt={auction.title}
            className="w-full rounded-lg shadow-lg"
          />
          <AudioPlayer audioUrl={auction.audioUrl} />
        </div>

        {/* Right: Auction Info */}
        <div className="space-y-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">{auction.title}</h2>
            <p className="text-gray-400 mb-4">{auction.description}</p>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400 mb-2">Time Remaining</h3>
              <CountdownTimer endTime={Number(auction.endTime)} onEnd={handleAuctionEnd} />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-400">Current Bid</p>
            <p className="text-xl font-bold">{parseFloat(auction.highestBid) / 1e18} ETH</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-400">Time Remaining</p>
            <p className="text-xl font-bold">
              {timeRemaining} minutes
            </p>
          </div>

          {isConnected ? (
            <div>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-1">Bid Amount (ETH)</label>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-1">Comment (Optional)</label>
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a comment..."
                    />
                  </div>
                </div>

                <button
                  onClick={handleBid}
                  disabled={!address || isPending || !bidAmount}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  {isPending ? 'Placing Bid...' : 'Place Bid'}
                </button>
                {isError && (
                  <div className="mt-2 text-red-500 text-sm">
                    {writeError?.message || 'Error placing bid. Please try again.'}
                  </div>
                )}
              </div>

              <div className="mt-8">
                <BidHistory bids={auction.bids} />
              </div>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Connect Wallet to Bid
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
