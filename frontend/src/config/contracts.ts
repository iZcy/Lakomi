export const CONTRACTS = {
  LAKOMI_TOKEN: '0xBB361f732DF9d30aB796136322ea75E69F3b94cE' as const,
  LAKOMI_VAULT: '0xE0D504963329D3F98888bd3b2fda4b68823492EB' as const,
  LAKOMI_GOVERN: '0x2A10e5a1Eb9c1f43E20992071e3CF2d8137bbceF' as const,
  LAKOMI_LOANS: '0x3ca10f66acE0d4aa0F427981e7697504db15300c' as const,
  MOCK_USDC: '0x1E13bAB730dF1e805e7a7dbA848EB227D95c8517' as const,
} as const

export const CHAIN_ID = 31337 // Anvil local chain

export const CONTRIBUTION_TIERS = {
  TIER_1: { name: 'Tier 1', min: 0, max: 499, ltv: 30, color: 'bg-gray-100 text-gray-800 border-gray-300' },
  TIER_2: { name: 'Tier 2', min: 500, max: 1999, ltv: 50, color: 'bg-blue-100 text-blue-800 border-blue-300' },
  TIER_3: { name: 'Tier 3', min: 2000, max: Infinity, ltv: 70, color: 'bg-purple-100 text-purple-800 border-purple-300' },
} as const

export const PROPOSAL_STATES = [
  'Pending',
  'Active',
  'Canceled',
  'Defeated',
  'Succeeded',
  'Queued',
  'Expired',
  'Executed',
] as const
