export const CONTRACTS = {
  MOCK_USDC: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as const,
  LAKOMI_TOKEN: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as const,
  LAKOMI_VAULT: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as const,
  LAKOMI_GOVERN: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as const,
  LAKOMI_LOANS: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9' as const,
} as const

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
