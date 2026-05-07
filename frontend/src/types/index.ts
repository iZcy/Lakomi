interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

export interface MemberStats {
  isMember: boolean
  votingPower: bigint
  contribution: bigint
  contributionTier: bigint
  ltv: bigint
  tokenBalance: bigint
}

export interface Loan {
  borrower: string
  amount: bigint
  collateralAmount: bigint
  repayAmount: bigint
  startTime: bigint
  isActive: boolean
  isApproved: boolean
}

export interface Proposal {
  id: bigint
  proposer: string
  targets: string[]
  values: bigint[]
  calldatas: string[]
  description: string
  state: bigint
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  hasVoted: boolean
}

export interface SimpananSummary {
  pokok: bigint
  wajibTotal: bigint
  wajibPeriodsPaid: bigint
  wajibPeriodsOwed: bigint
  sukarela: bigint
  totalContribution: bigint
}

export interface LoanData {
  id: bigint
  borrower: string
  principal: bigint
  interest: bigint
  collateralTokens: bigint
  startTime: bigint
  dueTime: bigint
  repaidAmount: bigint
  totalOwed: bigint
  remaining: bigint
  status: number
  reason: string
}

export interface ProposalData {
  proposer: string
  description: string
  startTime: bigint
  endTime: bigint
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  executed: boolean
  canceled: boolean
  vetoed: boolean
  proposalType: number
}

export function decodeSummary(raw: unknown): SimpananSummary | null {
  if (!raw) return null
  const a = raw as bigint[]
  if (!Array.isArray(a) || a.length < 6) return null
  return { pokok: a[0], wajibTotal: a[1], wajibPeriodsPaid: a[2], wajibPeriodsOwed: a[3], sukarela: a[4], totalContribution: a[5] }
}

export function decodeLoan(raw: unknown): LoanData | null {
  if (!raw) return null
  const a = raw as [bigint, string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, number, string]
  if (!Array.isArray(a) || a.length < 12) return null
  return { id: a[0], borrower: a[1], principal: a[2], interest: a[3], collateralTokens: a[4], startTime: a[5], dueTime: a[6], repaidAmount: a[7], totalOwed: a[8], remaining: a[9], status: a[10], reason: a[11] }
}

export function decodeProposal(raw: unknown): ProposalData | null {
  if (!raw) return null
  const a = raw as [string, string, number, bigint, bigint, bigint, bigint, bigint, boolean, boolean, boolean]
  if (!Array.isArray(a) || a.length < 11) return null
  return { proposer: a[0], description: a[1], proposalType: a[2], startTime: a[3], endTime: a[4], forVotes: a[5], againstVotes: a[6], abstainVotes: a[7], executed: a[8], canceled: a[9], vetoed: a[10] }
}
