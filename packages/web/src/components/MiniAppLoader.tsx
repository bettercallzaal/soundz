'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const HeroAuction = dynamic(
  () => import('@/components/HeroAuction').then(mod => ({ default: mod.HeroAuction })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
)

export default function MiniAppLoader() {
  // All state hooks must be called before any effects or conditional returns
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mounted) {
      setMounted(true)
      return
    }

    const initializeMiniApp = async () => {
      try {
        const { sdk } = await import('@farcaster/frame-sdk')
        await sdk.actions.ready()
        setIsLoading(false)
      } catch (err) {
        console.error('Error initializing Mini App:', err)
        setError('Failed to initialize Mini App. Please try again.')
        setIsLoading(false)
      }
    }

    initializeMiniApp()

    return () => {
      setIsLoading(false)
      setError(null)
    }
  }, [mounted])

  if (!mounted) return null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-red-500">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div suppressHydrationWarning>
      <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <HeroAuction />
        </div>
      </main>
    </div>
  )
}
