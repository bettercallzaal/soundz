import { createConfig, http } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import { customBaseSepolia, customBase } from './chains'
import { farcasterFrame } from '@farcaster/frame-wagmi-connector'

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!

export const config = createConfig({
  chains: [customBase, customBaseSepolia],
  transports: {
    [customBase.id]: http(),
    [customBaseSepolia.id]: http()
  },
  connectors: [
    injected(),
    walletConnect({ projectId }),
    farcasterFrame()
  ]
})
