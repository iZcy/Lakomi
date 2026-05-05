import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'

const RPC_URL = typeof import.meta.env.VITE_RPC_URL === 'string'
  ? import.meta.env.VITE_RPC_URL
  : 'http://127.0.0.1:8545'

export const anvil = {
  id: 31337,
  name: 'Anvil Lokal',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  testnet: true,
} as const

export const anvilRpc = http(RPC_URL, {
  timeout: 10_000,
  retryCount: 2,
})

export const wagmiConfig = createConfig({
  chains: [anvil],
  connectors: [injected()],
  transports: {
    [anvil.id]: anvilRpc,
  },
  ssr: false,
})
