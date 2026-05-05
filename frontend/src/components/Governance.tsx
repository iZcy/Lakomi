import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useIsMember, useProposalCount, useProposal, useProposalState, useHasVoted } from '../hooks/useContractRead'
import { useCreateProposal, useCastVote } from '../hooks/useContractWrite'
import { getProposalStateName, getProposalStateColor, formatTimestampShort } from '../lib/utils'
import { decodeProposal } from '../types'
import { CONTRACTS } from '../config/contracts'
import { MemberRegistration } from './MemberRegistration'

export function Governance() {
  const { address, isConnected } = useAccount()
  const { data: isMember } = useIsMember(address)
  const { data: proposalCount } = useProposalCount()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  if (!isConnected) return <EmptyState />
  if (!isMember) return <MemberRegistration />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Tata Kelola</h2>
        <p className="text-sm text-muted-foreground mt-1">Demokrasi langsung: 1 anggota = 1 suara (Pasal 22)</p>
      </div>

      <CreateProposalForm />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Daftar Usulan ({proposalCount?.toString() || '0'})</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {proposalCount && proposalCount > 0n ? (
                Array.from({ length: Number(proposalCount) }, (_, i) => Number(proposalCount) - 1 - i).map((id) => (
                  <ProposalListItem key={id} id={id} selected={selectedId === id} onClick={() => setSelectedId(id)} />
                ))
              ) : <p className="text-xs text-muted-foreground text-center py-6">Belum ada usulan</p>}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          {selectedId !== null ? <ProposalDetail id={BigInt(selectedId)} address={address} /> : (
            <Card className="flex items-center justify-center min-h-[300px]">
              <p className="text-sm text-muted-foreground">Pilih usulan untuk melihat detail</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateProposalForm() {
  const [desc, setDesc] = useState('')
  const { createProposal, isPending, isSuccess } = useCreateProposal()
  const handle = () => {
    if (!desc.trim()) return
    createProposal(desc, 0, CONTRACTS.LAKOMI_VAULT, 0n, '0x')
    setDesc('')
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Buat Usulan Baru</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea placeholder="Tulis usulan Anda..." value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
        <Button onClick={handle} disabled={!desc.trim() || isPending} size="sm">
          {isPending ? 'Membuat...' : 'Buat Usulan'}
        </Button>
        {isSuccess && <p className="text-xs text-emerald-500">Usulan berhasil dibuat!</p>}
      </CardContent>
    </Card>
  )
}

function ProposalListItem({ id, selected, onClick }: { id: number; selected: boolean; onClick: () => void }) {
  const { data: state } = useProposalState(BigInt(id))
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded-lg transition-colors text-sm flex items-center justify-between ${selected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}`}
    >
      <span className="font-medium">#{id + 1}</span>
      <Badge variant="outline" className={`text-[10px] ${state !== undefined ? getProposalStateColor(Number(state)) : ''}`}>
        {state !== undefined ? getProposalStateName(Number(state)) : ''}
      </Badge>
    </button>
  )
}

function ProposalDetail({ id, address }: { id: bigint; address?: `0x${string}` }) {
  const { data: proposalRaw } = useProposal(id)
  const proposal = decodeProposal(proposalRaw)
  const { data: state } = useProposalState(id)
  const { data: hasVoted } = useHasVoted(id, address)
  const { castVote, isPending, isSuccess } = useCastVote()

  if (!proposal) return null
  const total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-semibold">Usulan #{Number(id) + 1}</p>
              <p className="text-sm text-muted-foreground mt-1">{proposal.description}</p>
            </div>
            <Badge variant="outline" className={state !== undefined ? getProposalStateColor(Number(state)) : ''}>
              {state !== undefined ? getProposalStateName(Number(state)) : ''}
            </Badge>
          </div>
          <div className="space-y-2">
            <VoteBar label="Setuju" votes={proposal.forVotes} total={total} color="bg-emerald-500" />
            <VoteBar label="Tolak" votes={proposal.againstVotes} total={total} color="bg-red-500" />
            <VoteBar label="Abstain" votes={proposal.abstainVotes} total={total} color="bg-muted-foreground" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">Total: {total.toString()} suara</p>
        </CardContent>
      </Card>
      {state === 1 && (
        <Card>
          <CardContent className="">
            <p className="text-sm font-medium mb-3">Berikan Suara</p>
            {hasVoted || isSuccess ? (
              <p className="text-sm text-emerald-500">Anda sudah memberikan suara</p>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => castVote(id, 1)} disabled={isPending} size="sm">Setuju</Button>
                <Button variant="destructive" onClick={() => castVote(id, 0)} disabled={isPending} size="sm">Tolak</Button>
                <Button variant="outline" onClick={() => castVote(id, 2)} disabled={isPending} size="sm">Abstain</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function VoteBar({ label, votes, total, color }: { label: string; votes: bigint; total: bigint; color: string }) {
  const pct = total > 0n ? Number((votes * 100n) / total) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-14">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-16 text-right">{votes.toString()} ({pct}%)</span>
    </div>
  )
}

function EmptyState() {
  return <div className="flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Hubungkan dompet untuk berpartisipasi</p></div>
}
