import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { LAKOMI_TOKEN_ABI, LAKOMI_VAULT_ABI, LAKOMI_GOVERN_ABI, LAKOMI_LOANS_ABI, USDC_ABI } from '../abis'
import { CONTRACTS } from '../config/contracts'

type WriteResult = { hash: `0x${string}` }

export function useRegisterMember() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const registerMember = (): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_TOKEN,
      abi: LAKOMI_TOKEN_ABI,
      functionName: 'registerMember',
      args: [],
    })
  }

  return { registerMember, hash, error, isPending, isConfirming, isSuccess }
}

export function usePaySimpananPokok() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const paySimpananPokok = (member: `0x${string}`): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_VAULT,
      abi: LAKOMI_VAULT_ABI,
      functionName: 'paySimpananPokok',
      args: [member],
    })
  }

  return { paySimpananPokok, hash, error, isPending, isConfirming, isSuccess }
}

export function usePaySimpananWajib() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const paySimpananWajib = (): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_VAULT,
      abi: LAKOMI_VAULT_ABI,
      functionName: 'paySimpananWajib',
      args: [],
    })
  }

  return { paySimpananWajib, hash, error, isPending, isConfirming, isSuccess }
}

export function useDeposit() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const deposit = (amount: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_VAULT,
      abi: LAKOMI_VAULT_ABI,
      functionName: 'deposit',
      args: [amount],
    })
  }

  return { deposit, hash, error, isPending, isConfirming, isSuccess }
}

export function useClaimSHU() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const claimSHU = (distributionId: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_VAULT,
      abi: LAKOMI_VAULT_ABI,
      functionName: 'claimSHU',
      args: [distributionId],
    })
  }

  return { claimSHU, hash, error, isPending, isConfirming, isSuccess }
}

export function useRequestWithdrawal() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const requestWithdrawal = (recipient: `0x${string}`, amount: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_VAULT,
      abi: LAKOMI_VAULT_ABI,
      functionName: 'requestWithdrawal',
      args: [recipient, amount],
    })
  }

  return { requestWithdrawal, hash, error, isPending, isConfirming, isSuccess }
}

export function useCreateProposal() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const createProposal = (
    description: string,
    proposalType: number,
    target: `0x${string}`,
    value: bigint,
    callData: `0x${string}`
  ): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_GOVERN,
      abi: LAKOMI_GOVERN_ABI,
      functionName: 'createProposal',
      args: [description, proposalType, target, value, callData],
    })
  }

  return { createProposal, hash, error, isPending, isConfirming, isSuccess }
}

export function useCastVote() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const castVote = (proposalId: bigint, support: number): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_GOVERN,
      abi: LAKOMI_GOVERN_ABI,
      functionName: 'castVote',
      args: [proposalId, support],
    })
  }

  return { castVote, hash, error, isPending, isConfirming, isSuccess }
}

export function useRequestLoan() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const requestLoan = (amount: bigint, duration: bigint, reason: string): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_LOANS,
      abi: LAKOMI_LOANS_ABI,
      functionName: 'requestLoan',
      args: [amount, duration, reason],
    })
  }

  return { requestLoan, hash, error, isPending, isConfirming, isSuccess }
}

export function useRepayLoan() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const repayLoan = (loanId: bigint, amount: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_LOANS,
      abi: LAKOMI_LOANS_ABI,
      functionName: 'repay',
      args: [loanId, amount],
    })
  }

  return { repayLoan, hash, error, isPending, isConfirming, isSuccess }
}

export function useRepayInFull() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const repayInFull = (loanId: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_LOANS,
      abi: LAKOMI_LOANS_ABI,
      functionName: 'repayInFull',
      args: [loanId],
    })
  }

  return { repayInFull, hash, error, isPending, isConfirming, isSuccess }
}

export function useApproveUsdc() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const approve = (spender: `0x${string}`, amount: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.MOCK_USDC,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [spender, amount],
    })
  }

  return { approve, hash, error, isPending, isConfirming, isSuccess }
}

export function useMintUsdc() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const mintUsdc = (to: `0x${string}`, amount: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.MOCK_USDC,
      abi: USDC_ABI,
      functionName: 'mint',
      args: [to, amount],
    })
  }

  return { mintUsdc, hash, error, isPending, isConfirming, isSuccess }
}
