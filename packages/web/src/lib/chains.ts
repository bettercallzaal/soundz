import { baseSepolia, base } from 'viem/chains'
import { Chain } from 'viem'

export const customBaseSepolia: Chain = {
  ...baseSepolia,
  rpcUrls: {
    ...baseSepolia.rpcUrls,
    default: {
      http: [process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL!]
    },
    public: {
      http: [process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL!]
    }
  }
}

export const customBase: Chain = {
  ...base,
  rpcUrls: {
    ...base.rpcUrls,
    default: {
      http: [process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL!]
    },
    public: {
      http: [process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL!]
    }
  }
}
