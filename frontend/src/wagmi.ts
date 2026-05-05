import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'

export const anvil = {
  id: 31337,
  name: 'Anvil Lokal',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
} as const

export const anvilRpc = http('http://127.0.0.1:8545', {
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
