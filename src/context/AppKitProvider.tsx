import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet } from '@reown/appkit/networks'
import { defineChain } from 'viem'
import { WagmiProvider, createStorage, cookieStorage } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// 1. Get projectId from environment or use provide default
const projectId = '90f7c21eef9af7a0b4ae6f05eb8e9f88'

// 2. Define custom Hedera Testnet chain
export const hederaTestnet = defineChain({
  id: 296,
  name: 'Hedera Testnet',
  nativeCurrency: {
    decimals: 8,
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.hashio.io/api'],
    },
  },
  blockExplorers: {
    default: { name: 'Hashscan', url: 'https://hashscan.io/testnet' },
  },
})

// 3. Set up networks
const networks = [mainnet, hederaTestnet]

// 4. Set up Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: false,
  networks,
  projectId
})

// 5. Create AppKit
createAppKit({
  adapters: [wagmiAdapter],
  networks: networks as any,
  defaultNetwork: hederaTestnet,
  projectId,
  metadata: {
    name: 'Hashpilot',
    description: 'Vite-powered Intent-Based AI Copilot for Hedera',
    url: window.location.origin,
    icons: ['https://avatars.githubusercontent.com/u/37784886']
  },
  features: {
    analytics: true
  }
})

const queryClient = new QueryClient()

export default function AppKitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
