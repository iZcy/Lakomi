import { http, createConfig } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'

// Define Anvil local chain
export const anvil = {
  id: 31337,
  name: 'Anvil',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
} as const

export const wagmiConfig = createConfig({
  chains: [anvil],
  connectors: [
    injected(),
    walletConnect({
      projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Optional: Get from https://cloud.walletconnect.com
      showQrModal: false,
    }),
  ],
  transports: {
    [anvil.id]: http(),
  },
  ssr: true,
})
