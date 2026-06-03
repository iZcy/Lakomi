const FALLBACK: Record<string, string> = {
  MOCK_IDRX: '0x9a676e781a523b5d0c0e43731313a708cb607508',
  LAKOMI_TOKEN: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1',
  LAKOMI_VAULT: '0x0B306BF915C4d645ff596e518fAf3F9669b97016',
  LAKOMI_GOVERN: '0x9A9f2CCfdE556A7e9Ff0848998Aa4a0CFD8863AE',
  LAKOMI_LOANS: '0x68B1D87F95878fE05B998F19b66F4bABa5De1aEd',
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
