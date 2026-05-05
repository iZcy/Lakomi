import { useReadContract } from 'wagmi'
import { LAKOMI_TOKEN_ABI, LAKOMI_VAULT_ABI, LAKOMI_GOVERN_ABI, LAKOMI_LOANS_ABI, USDC_ABI } from '../abis'
import { CONTRACTS } from '../config/contracts'

export function useTokenBalance(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_TOKEN,
    abi: LAKOMI_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useIsMember(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_TOKEN,
    abi: LAKOMI_TOKEN_ABI,
    functionName: 'isRegisteredMember',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useVotingPower(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_TOKEN,
    abi: LAKOMI_TOKEN_ABI,
    functionName: 'getVotingPower',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useMemberCount() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_TOKEN,
    abi: LAKOMI_TOKEN_ABI,
    functionName: 'getMemberCount',
  })
}

export function useLockedBalance(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_TOKEN,
    abi: LAKOMI_TOKEN_ABI,
    functionName: 'getLockedBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useAvailableBalance(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_TOKEN,
    abi: LAKOMI_TOKEN_ABI,
    functionName: 'getAvailableBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useHasPaidPokok(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'hasPaidSimpananPokok',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useSimpananSummary(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'getSimpananSummary',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useContributionTier(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'getContributionTier',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useTotalAssets() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'getTotalAssets',
  })
}

export function useMemberSharePercent(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'getMemberSharePercent',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function usePendingSHU(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'getPendingSHU',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useShuDistributionCount() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'shuDistributionCount',
  })
}

export function useShuDistribution(index: bigint) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'shuDistributions',
    args: [index],
    query: { enabled: index >= 0n },
  })
}

export function useAccumulatedRevenue() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'accumulatedRevenue',
  })
}

export function useSimpananPokokAmount() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'simpananPokokAmount',
  })
}

export function useSimpananWajibAmount() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'simpananWajibAmount',
  })
}

export function useProposalCount() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_GOVERN,
    abi: LAKOMI_GOVERN_ABI,
    functionName: 'proposalCount',
  })
}

export function useProposalState(proposalId: bigint) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_GOVERN,
    abi: LAKOMI_GOVERN_ABI,
    functionName: 'state',
    args: [proposalId],
    query: { enabled: proposalId >= 0n },
  })
}

export function useProposal(proposalId: bigint) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_GOVERN,
    abi: LAKOMI_GOVERN_ABI,
    functionName: 'proposals',
    args: [proposalId],
    query: { enabled: proposalId >= 0n },
  })
}

export function useHasVoted(proposalId: bigint, address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_GOVERN,
    abi: LAKOMI_GOVERN_ABI,
    functionName: 'hasVoted',
    args: address ? [proposalId, address] : undefined,
    query: { enabled: proposalId >= 0n && !!address },
  })
}

export function useIsRATDue() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_GOVERN,
    abi: LAKOMI_GOVERN_ABI,
    functionName: 'isRATDue',
  })
}

export function useMaxLoanAmount(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_LOANS,
    abi: LAKOMI_LOANS_ABI,
    functionName: 'getMaxLoanAmount',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useBorrowerLoans(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_LOANS,
    abi: LAKOMI_LOANS_ABI,
    functionName: 'getBorrowerLoans',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useLoan(loanId: bigint) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_LOANS,
    abi: LAKOMI_LOANS_ABI,
    functionName: 'getLoan',
    args: [loanId],
    query: { enabled: loanId >= 0n },
  })
}

export function useActiveLoanCount() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_LOANS,
    abi: LAKOMI_LOANS_ABI,
    functionName: 'activeLoanCount',
  })
}

export function useUsdcBalance(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.MOCK_USDC,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && CONTRACTS.MOCK_USDC !== '0x0000000000000000000000000000000000000000' },
  })
}
