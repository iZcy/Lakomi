import { useReadContract } from 'wagmi'
import { LAKOMI_TOKEN_ABI, LAKOMI_VAULT_ABI, LAKOMI_GOVERN_ABI, LAKOMI_LOANS_ABI, USDC_ABI } from '../abis'
import { CONTRACTS } from '../config/contracts'

export function useTokenBalance(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_TOKEN,
    abi: LAKOMI_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })
}

export function useIsMember(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_TOKEN,
    abi: LAKOMI_TOKEN_ABI,
    functionName: 'isRegisteredMember',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })
}

export function useVotingPower(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_TOKEN,
    abi: LAKOMI_TOKEN_ABI,
    functionName: 'getVotingPower',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })
}

export function useMemberCount() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_TOKEN,
    abi: LAKOMI_TOKEN_ABI,
    functionName: 'getMemberCount',
  })
}

export function useContribution(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'getContribution',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })
}

export function useContributionTier(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'getContributionTier',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })
}

export function useTotalContributions() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'getTotalContributions',
  })
}

export function useAvailableLiquidity() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_VAULT,
    abi: LAKOMI_VAULT_ABI,
    functionName: 'getAvailableLiquidity',
  })
}

export function useMemberLTV(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_LOANS,
    abi: LAKOMI_LOANS_ABI,
    functionName: 'getMemberLTV',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })
}

export function useActiveLoanCount() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_LOANS,
    abi: LAKOMI_LOANS_ABI,
    functionName: 'getActiveLoanCount',
  })
}

export function useLoan(loanId: bigint) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_LOANS,
    abi: LAKOMI_LOANS_ABI,
    functionName: 'getLoan',
    args: [loanId],
    query: {
      enabled: loanId >= 0n,
    },
  })
}

export function useProposalCount() {
  return useReadContract({
    address: CONTRACTS.LAKOMI_GOVERN,
    abi: LAKOMI_GOVERN_ABI,
    functionName: 'getProposalCount',
  })
}

export function useProposalState(proposalId: bigint) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_GOVERN,
    abi: LAKOMI_GOVERN_ABI,
    functionName: 'state',
    args: [proposalId],
    query: {
      enabled: proposalId >= 0n,
    },
  })
}

export function useProposalVotes(proposalId: bigint) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_GOVERN,
    abi: LAKOMI_GOVERN_ABI,
    functionName: 'proposalVotes',
    args: [proposalId],
    query: {
      enabled: proposalId >= 0n,
    },
  })
}

export function useHasVoted(proposalId: bigint, address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.LAKOMI_GOVERN,
    abi: LAKOMI_GOVERN_ABI,
    functionName: 'hasVoted',
    args: address ? [proposalId, address] : undefined,
    query: {
      enabled: proposalId >= 0n && !!address,
    },
  })
}

export function useUsdcBalance(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.MOCK_USDC,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && CONTRACTS.MOCK_USDC !== '0x0000000000000000000000000000000000000000',
    },
  })
}
