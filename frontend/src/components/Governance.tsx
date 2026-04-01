import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useIsMember, useProposalCount, useProposalState, useProposalVotes, useHasVoted } from '../hooks/useContractRead'
import { usePropose, useCastVote } from '../hooks/useContractWrite'
import { getProposalStateName, getProposalStateColor } from '../lib/utils'
import { FileText, CheckCircle2, XCircle, Plus, Send } from 'lucide-react'
import { MemberRegistration } from './MemberRegistration'

export function Governance() {
  const { address, isConnected } = useAccount()
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null)

  const { data: isMember } = useIsMember(address)
  const { data: proposalCount } = useProposalCount()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-500/10 to-purple-500/10 rounded-full blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl font-bold gradient-text mb-2">Governance</h2>
          <p className="text-gray-400 text-lg">Create and vote on proposals. 1 member = 1 vote.</p>
        </div>
      </div>

      {!isConnected ? (
        <div className="glass-card p-12 flex items-center justify-center">
          <p className="text-gray-400">Please connect your wallet to participate in governance</p>
        </div>
      ) : !isMember ? (
        <MemberRegistration />
      ) : (
        <>
          <CreateProposal />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Proposal List */}
            <div className="lg:col-span-1">
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-400" />
                  Proposals ({proposalCount?.toString() || '0'})
                </h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {proposalCount && proposalCount > 0n ? (
                    Array.from({ length: Math.min(Number(proposalCount), 10) }, (_, i) => Number(proposalCount) - 1 - i).map((id) => (
                      <button
                        key={id}
                        onClick={() => setSelectedProposal(id)}
                        className={`w-full text-left p-4 rounded-xl transition-all ${
                          selectedProposal === id
                            ? 'bg-gradient-to-r from-sky-500 to-purple-500 text-white shadow-lg shadow-sky-500/30'
                            : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="font-bold text-lg mb-1">#{id + 1}</div>
                        <div className="text-xs opacity-70">Click to view details</div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">No proposals yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Proposal Detail */}
            <div className="lg:col-span-2">
              {selectedProposal !== null ? (
                <ProposalDetail proposalId={BigInt(selectedProposal)} address={address} />
              ) : (
                <div className="glass-card p-12 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Select a proposal to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CreateProposal() {
  const { address } = useAccount()
  const [description, setDescription] = useState('')
  const { propose, isPending, isSuccess, error } = usePropose()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return

    try {
      await propose(
        [address!], // target
        [0n], // values
        [0n], // calldatas
        description, // description
      )
      setDescription('')
    } catch (err) {
      console.error('Failed to create proposal:', err)
    }
  }

  return (
    <div className="glass-card p-8">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Plus className="w-5 h-5 text-sky-400" />
        Create Proposal
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Proposal Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your proposal..."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 resize-none"
            rows={4}
          />
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={!description.trim() || isPending}
            className="glow-button px-6 py-3 bg-gradient-to-r from-sky-500 to-purple-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isPending ? 'Creating...' : 'Create Proposal'}
          </button>
          {isSuccess && (
            <p className="text-green-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Proposal created successfully!
            </p>
          )}
          {error && (
            <p className="text-red-400 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Failed to create proposal
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

function ProposalDetail({ proposalId, address }: { proposalId: bigint; address?: `0x${string}` }) {
  const { data: state } = useProposalState(proposalId)
  const { data: votes } = useProposalVotes(proposalId)
  const { data: hasVoted } = useHasVoted(proposalId, address)
  const { castVote, isPending } = useCastVote()

  const [support, setSupport] = useState<boolean | null>(null)

  const handleVote = async (voteSupport: boolean) => {
    if (!address) return
    try {
      await castVote(proposalId, voteSupport)
      setSupport(voteSupport)
    } catch (err) {
      console.error('Failed to cast vote:', err)
    }
  }

  const stateName = state !== undefined ? getProposalStateName(Number(state)) : 'Unknown'
  const stateColor = state !== undefined ? getProposalStateColor(Number(state)) : 'bg-gray-100 text-gray-800'

  const forVotes = votes?.forVotes || 0n
  const againstVotes = votes?.againstVotes || 0n
  const abstainVotes = votes?.abstainVotes || 0n
  const total = forVotes + againstVotes + abstainVotes

  const forPercentage = total > 0n ? (Number(forVotes) / Number(total)) * 100 : 0
  const againstPercentage = total > 0n ? (Number(againstVotes) / Number(total)) * 100 : 0
  const abstainPercentage = total > 0n ? (Number(abstainVotes) / Number(total)) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Proposal Header */}
      <div className="glass-card p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Proposal #{Number(proposalId) + 1}</h3>
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${stateColor}`}>
              {stateName}
            </span>
          </div>
        </div>

        {/* Voting Results */}
        <div className="space-y-4">
          <VoteBar label="For" votes={forVotes} percentage={forPercentage} color="from-green-500 to-emerald-500" />
          <VoteBar label="Against" votes={againstVotes} percentage={againstPercentage} color="from-red-500 to-pink-500" />
          <VoteBar label="Abstain" votes={abstainVotes} percentage={abstainPercentage} color="from-gray-500 to-slate-500" />
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-gray-400 text-sm">
            Total Votes: <span className="text-white font-semibold">{total.toString()}</span>
          </p>
        </div>
      </div>

      {/* Vote Section */}
      {state === 1n && (
        <div className="glass-card p-8">
          <h4 className="text-lg font-bold text-white mb-4">Cast Your Vote</h4>
          {hasVoted ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span>You have voted on this proposal</span>
            </div>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => handleVote(true)}
                disabled={isPending}
                className="glow-button flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-green-500/30 transition-all"
              >
                For
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={isPending}
                className="glow-button flex-1 px-6 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-red-500/30 transition-all"
              >
                Against
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function VoteBar({
  label,
  votes,
  percentage,
  color,
}: {
  label: string
  votes: bigint
  percentage: number
  color: string
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-white font-semibold">{votes.toString()} votes ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
