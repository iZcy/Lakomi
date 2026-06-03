const FALLBACK: Record<string, string> = {
  MOCK_IDRX: '0xC05A8D92702253C5db45762399D39dCc3c2cB525',
  LAKOMI_TOKEN: '0xa23E3E4BfEAfC485Bb26021609F2CB4a0FbCF0a1',
  LAKOMI_VAULT: '0x2f72d86fbA46A418EA83a9986d62EBEEA8CE284D',
  LAKOMI_GOVERN: '0xC9c16965a9B010785Dc8B0A7a46D2e6B00948C80',
  LAKOMI_LOANS: '0x48eC878AD39722d76cFD6393d2d2dcc0Eab9A8b3',
}

const DEPLOYER_URL = typeof import.meta.env.VITE_DEPLOYER_URL === 'string'
  ? import.meta.env.VITE_DEPLOYER_URL
  : 'http://localhost:3030'

export const CONTRACTS: Record<string, string> = { ...FALLBACK }

export let contractsReady = false

export async function loadContracts(): Promise<void> {
  try {
    const res = await fetch(`${DEPLOYER_URL}/contracts`)
    if (res.ok) {
      const data = await res.json()
      Object.assign(CONTRACTS, data)
      contractsReady = true
    }
  } catch (e) {
    // silent: using fallback contract addresses
  }
}

loadContracts()

import { CHAIN_ID } from '../wagmi'

export const PROPOSAL_STATES = [
  'Menunggu',
  'Aktif',
  'Dibatalkan',
  'Ditolak',
  'Berhasil',
  'Dalam Antrean',
  'Kedaluwarsa',
  'Dieksekusi',
  'Diveto',
] as const

export const PROPOSAL_TYPES = [
  'Umum',
  'Anggaran',
  'RAT Tahunan',
  'Perubahan Aturan',
] as const

export const LOAN_STATES = [
  'Menunggu',
  'Disetujui',
  'Aktif',
  'Lunas',
  'Gagal Bayar',
] as const

export const USDC_DECIMALS = 6
export const LAK_DECIMALS = 18
