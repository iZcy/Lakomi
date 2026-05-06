import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseGwei } from 'viem'
import { LAKOMI_TOKEN_ABI, LAKOMI_VAULT_ABI, LAKOMI_GOVERN_ABI, LAKOMI_LOANS_ABI, USDC_ABI } from '../abis'
import { CONTRACTS } from '../config/contracts'

type WriteResult = { hash: `0x${string}` }

const GAS_OVERRIDES = { maxFeePerGas: parseGwei('100'), maxPriorityFeePerGas: parseGwei('1') }

export function useRegisterMember() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const registerMember = (): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_TOKEN,
      abi: LAKOMI_TOKEN_ABI,
      functionName: 'registerMember',
      args: [],
      ...GAS_OVERRIDES,
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
      ...GAS_OVERRIDES,
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
    ...GAS_OVERRIDES,
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
    ...GAS_OVERRIDES,
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
    ...GAS_OVERRIDES,
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
    ...GAS_OVERRIDES,
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
    ...GAS_OVERRIDES,
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
    ...GAS_OVERRIDES,
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
    ...GAS_OVERRIDES,
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
    ...GAS_OVERRIDES,
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
    ...GAS_OVERRIDES,
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
    ...GAS_OVERRIDES,
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
    ...GAS_OVERRIDES,
    })
  }

  return { mintUsdc, hash, error, isPending, isConfirming, isSuccess }
}

export function useQueueProposal() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const queueProposal = (proposalId: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_GOVERN,
      abi: LAKOMI_GOVERN_ABI,
      functionName: 'queue',
      args: [proposalId],
    ...GAS_OVERRIDES,
    })
  }

  return { queueProposal, hash, error, isPending, isConfirming, isSuccess }
}

export function useExecuteProposal() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const executeProposal = (proposalId: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_GOVERN,
      abi: LAKOMI_GOVERN_ABI,
      functionName: 'execute',
      args: [proposalId],
    ...GAS_OVERRIDES,
    })
  }

  return { executeProposal, hash, error, isPending, isConfirming, isSuccess }
}

export function useCancelProposal() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const cancelProposal = (proposalId: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_GOVERN,
      abi: LAKOMI_GOVERN_ABI,
      functionName: 'cancel',
      args: [proposalId],
    ...GAS_OVERRIDES,
    })
  }

  return { cancelProposal, hash, error, isPending, isConfirming, isSuccess }
}

export function useDistributeSHU() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const distributeSHU = (): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_VAULT,
      abi: LAKOMI_VAULT_ABI,
      functionName: 'distributeSHU',
      args: [],
    ...GAS_OVERRIDES,
    })
  }

  return { distributeSHU, hash, error, isPending, isConfirming, isSuccess }
}

export function useDisburseLoan() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const disburseLoan = (loanId: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_LOANS,
      abi: LAKOMI_LOANS_ABI,
      functionName: 'disburse',
      args: [loanId],
    ...GAS_OVERRIDES,
    })
  }

  return { disburseLoan, hash, error, isPending, isConfirming, isSuccess }
}

export function useApproveLoan() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const approveLoan = (loanId: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_LOANS,
      abi: LAKOMI_LOANS_ABI,
      functionName: 'approveLoan',
      args: [loanId],
    ...GAS_OVERRIDES,
    })
  }

  return { approveLoan, hash, error, isPending, isConfirming, isSuccess }
}

export function useMarkDefaulted() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const markDefaulted = (loanId: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_LOANS,
      abi: LAKOMI_LOANS_ABI,
      functionName: 'markDefaulted',
      args: [loanId],
    ...GAS_OVERRIDES,
    })
  }

  return { markDefaulted, hash, error, isPending, isConfirming, isSuccess }
}

export function useClaimCollateral() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const claimCollateral = (loanId: bigint): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_LOANS,
      abi: LAKOMI_LOANS_ABI,
      functionName: 'claimCollateral',
      args: [loanId],
    ...GAS_OVERRIDES,
    })
  }

  return { claimCollateral, hash, error, isPending, isConfirming, isSuccess }
}

export function useScheduleRAT() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const scheduleRAT = (description: string): Promise<WriteResult> => {
    return writeContractAsync({
      address: CONTRACTS.LAKOMI_GOVERN,
      abi: LAKOMI_GOVERN_ABI,
      functionName: 'scheduleAnnualRAT',
      args: [description],
    ...GAS_OVERRIDES,
    })
  }

  return { scheduleRAT, hash, error, isPending, isConfirming, isSuccess }
}
