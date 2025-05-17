'use client'

import dynamic from 'next/dynamic'

const MiniAppLoader = dynamic(
  () => import('@/components/MiniAppLoader'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
)

export function ClientMiniApp() {
  return (
    <div suppressHydrationWarning>
      <MiniAppLoader />
    </div>
  )
}
