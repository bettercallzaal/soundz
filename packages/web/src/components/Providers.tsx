'use client'

import { WagmiProvider } from 'wagmi'
import { customBaseSepolia, customBase } from '@/lib/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/wagmi'
import { ApolloWrapper } from './ApolloWrapper'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ApolloWrapper>
          {children}
        </ApolloWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
