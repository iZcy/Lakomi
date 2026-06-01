import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'

const RPC_URL = typeof import.meta.env.VITE_RPC_URL === 'string'
  ? import.meta.env.VITE_RPC_URL
  : 'http://127.0.0.1:8545'

export const CHAIN_ID = 31337
export const CHAIN_ID_HEX = '0x7a69'
export const CHAIN_NAME = 'Anvil Lokal'

export const anvil = {
  id: CHAIN_ID,
  name: CHAIN_NAME,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  testnet: true,
} as const

export const WALLET_CHAIN_PARAMS = {
  chainId: CHAIN_ID_HEX,
  chainName: CHAIN_NAME,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: [RPC_URL],
}

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
