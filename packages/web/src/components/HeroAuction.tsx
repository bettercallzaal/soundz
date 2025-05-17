'use client'

import dynamic from 'next/dynamic'
import { useAccount, useConnect, useWriteContract } from 'wagmi'
import { useState, useEffect, useCallback } from 'react'
import { parseEther } from 'viem'
import { customBase } from '@/lib/chains'
import { AUCTION_HOUSE_ABI } from '@/lib/contracts'
import { useQuery } from '@apollo/client'
import { GET_LIVE_AUCTION } from '@/lib/queries'
import type { Auction } from '@/lib/types'

const CountdownTimer = dynamic(() => import('./CountdownTimer').then(mod => ({ default: mod.CountdownTimer })), { ssr: false })
const BidHistory = dynamic(() => import('./BidHistory').then(mod => ({ default: mod.BidHistory })), { ssr: false })
const AudioPlayer = dynamic(() => import('./AudioPlayer').then(mod => ({ default: mod.AudioPlayer })), { ssr: false })

export function HeroAuction() {
  // 1. All context hooks
  const { isConnected, address } = useAccount()
  const { connect, connectors } = useConnect()
  const { writeContract, isPending, isError, error: writeError } = useWriteContract()
  const { data, loading, error } = useQuery<{ auctions: Auction[] }>(GET_LIVE_AUCTION)
  
  // 2. All state hooks
  const [mounted, setMounted] = useState(false)
  const [bidAmount, setBidAmount] = useState('')
  const [comment, setComment] = useState('')

  // 3. All callback hooks
  const handleAuctionEnd = useCallback(() => {
    // No need to refetch here as the query will auto-refresh
  }, [])

  const handleBidSubmit = useCallback(async () => {
    if (!address || !bidAmount || !data?.auctions?.[0]) return

    try {
      const auctionHouseAddress = process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS
      if (!auctionHouseAddress) {
        throw new Error('Auction house address not configured')
      }

      await writeContract({
        abi: AUCTION_HOUSE_ABI,
        address: auctionHouseAddress as `0x${string}`,
        functionName: 'placeBid',
        args: [BigInt(data.auctions[0].tokenId), comment],
        value: parseEther(bidAmount),
        chain: customBase,
        account: address
      })

      setBidAmount('')
      setComment('')
    } catch (err) {
      console.error('Error placing bid:', err)
    }
  }, [address, bidAmount, comment, data, writeContract])

  // 4. All effect hooks
  useEffect(() => {
    setMounted(true)
  }, [])

  // 5. Early returns
  if (!mounted) return null

  if (loading) {
    return (
      <div className="animate-pulse bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="h-[480px] bg-white/5 rounded-2xl"></div>
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="h-12 bg-white/5 rounded-xl w-3/4"></div>
              <div className="h-24 bg-white/5 rounded-xl"></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-24 bg-white/5 rounded-2xl"></div>
              <div className="h-24 bg-white/5 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
        <p className="text-red-400">{error.message}</p>
      </div>
    )
  }

  if (!data?.auctions?.[0]) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
        <p className="text-red-400">No active auctions found.</p>
      </div>
    )
  }

  const auction = data.auctions[0]
  const endTime = new Date(parseInt(auction.endTime) * 1000)
  const timeRemaining = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000 / 60))

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Image and Audio */}
        <div className="space-y-8">
          <div className="relative group rounded-2xl overflow-hidden">
            <img
              src={auction.coverImage}
              alt={auction.title}
              className="w-full h-[480px] object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <AudioPlayer audioUrl={auction.audioUrl} />
          </div>
        </div>

        {/* Right: Auction Info */}
        <div className="space-y-8">
          <div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              {auction.title}
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed mb-8">
              {auction.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 transform hover:scale-105 transition-all duration-300">
              <p className="text-gray-400 text-sm font-medium mb-2">Current Bid</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                {parseFloat(auction.highestBid) / 1e18} ETH
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 transform hover:scale-105 transition-all duration-300">
              <p className="text-gray-400 text-sm font-medium mb-2">Time Remaining</p>
              <CountdownTimer endTime={Number(auction.endTime)} onEnd={handleAuctionEnd} />
            </div>
          </div>

          {isConnected ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Bid Amount (ETH)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="w-full bg-white/5 text-white px-4 py-4 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all placeholder-gray-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl pointer-events-none"></div>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Comment (Optional)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full bg-white/5 text-white px-4 py-4 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all placeholder-gray-500"
                      placeholder="Add a comment..."
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl pointer-events-none"></div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleBidSubmit}
                disabled={!address || isPending || !bidAmount}
                className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:via-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-bold py-5 px-8 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 shadow-xl disabled:shadow-none text-lg"
              >
                {isPending ? 'Placing Bid...' : 'Place Bid'}
              </button>

              {isError && (
                <div className="mt-6 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                  {writeError?.message || 'Error placing bid. Please try again.'}
                </div>
              )}

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <BidHistory bids={auction.bids} />
              </div>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold py-5 px-8 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl text-lg"
            >
              Connect Wallet to Bid
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
