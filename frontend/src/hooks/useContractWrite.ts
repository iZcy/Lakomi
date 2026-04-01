import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { LAKOMI_TOKEN_ABI, LAKOMI_VAULT_ABI, LAKOMI_GOVERN_ABI, LAKOMI_LOANS_ABI, USDC_ABI } from '../abis'
import { CONTRACTS } from '../config/contracts'

export function useRegisterMember() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const registerMember = (address: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.LAKOMI_TOKEN,
      abi: LAKOMI_TOKEN_ABI,
      functionName: 'registerMember',
      args: [address],
    })
  }

  return { registerMember, hash, error, isPending, isConfirming, isSuccess }
}

export function useDeposit() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const deposit = (amount: bigint) => {
    writeContract({
      address: CONTRACTS.LAKOMI_VAULT,
      abi: LAKOMI_VAULT_ABI,
      functionName: 'deposit',
      args: [amount],
    })
  }

  return { deposit, hash, error, isPending, isConfirming, isSuccess }
}

export function useRequestWithdrawal() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const requestWithdrawal = (amount: bigint) => {
    writeContract({
      address: CONTRACTS.LAKOMI_VAULT,
      abi: LAKOMI_VAULT_ABI,
      functionName: 'requestWithdrawal',
      args: [amount],
    })
  }

  return { requestWithdrawal, hash, error, isPending, isConfirming, isSuccess }
}

export function usePropose() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const propose = (
    targets: `0x${string}`[],
    values: bigint[],
    calldatas: `0x${string}`[],
    description: string
  ) => {
    writeContract({
      address: CONTRACTS.LAKOMI_GOVERN,
      abi: LAKOMI_GOVERN_ABI,
      functionName: 'propose',
      args: [targets, values, calldatas, description],
    })
  }

  return { propose, hash, error, isPending, isConfirming, isSuccess }
}

export function useCastVote() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const castVote = (proposalId: bigint, support: 0 | 1 | 2) => {
    writeContract({
      address: CONTRACTS.LAKOMI_GOVERN,
      abi: LAKOMI_GOVERN_ABI,
      functionName: 'castVote',
      args: [proposalId, support],
    })
  }

  return { castVote, hash, error, isPending, isConfirming, isSuccess }
}

export function useRequestLoan() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const requestLoan = (amount: bigint, collateralAmount: bigint) => {
    writeContract({
      address: CONTRACTS.LAKOMI_LOANS,
      abi: LAKOMI_LOANS_ABI,
      functionName: 'requestLoan',
      args: [amount, collateralAmount],
    })
  }

  return { requestLoan, hash, error, isPending, isConfirming, isSuccess }
}

export function useRepayLoan() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const repayLoan = (loanId: bigint) => {
    writeContract({
      address: CONTRACTS.LAKOMI_LOANS,
      abi: LAKOMI_LOANS_ABI,
      functionName: 'repayLoan',
      args: [loanId],
    })
  }

  return { repayLoan, hash, error, isPending, isConfirming, isSuccess }
}

export function useApproveUsdc() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const approve = (amount: bigint) => {
    writeContract({
      address: CONTRACTS.MOCK_USDC,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [CONTRACTS.LAKOMI_VAULT, amount],
    })
  }

  return { approve, hash, error, isPending, isConfirming, isSuccess }
}
