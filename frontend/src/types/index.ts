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

export interface ContributionTier {
  name: string
  min: number
  max: number
  ltv: number
  color: string
}
