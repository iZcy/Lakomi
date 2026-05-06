const FALLBACK: Record<string, string> = {
  MOCK_USDC: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  LAKOMI_TOKEN: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  LAKOMI_VAULT: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  LAKOMI_GOVERN: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  LAKOMI_LOANS: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
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
      console.log('Contract addresses loaded from deployer:', data)
    }
  } catch (e) {
    console.warn('Failed to load contract addresses from deployer, using fallbacks:', e)
  }
}

loadContracts()

export const CHAIN_ID = 313377

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
