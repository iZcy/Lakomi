import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useIsMember, useProposalCount, useProposal, useProposalState, useHasVoted, useIsRATDue } from '../hooks/useContractRead'
import { useCreateProposal, useCastVote, useQueueProposal, useExecuteProposal, useCancelProposal, useScheduleRAT } from '../hooks/useContractWrite'
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

  const count = proposalCount ? Number(proposalCount) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Tata Kelola</h2>
        <p className="text-sm text-muted-foreground mt-1">Demokrasi langsung: 1 anggota = 1 suara (Pasal 22)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <CreateProposalForm />
          <RATSection />
        </div>

        <div className="lg:col-span-2 space-y-4">
          {count > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Daftar Usulan</h3>
              {Array.from({ length: count }, (_, i) => count - 1 - i).map((id) => (
                <ProposalListItem key={id} id={id} selected={selectedId === id} onClick={() => setSelectedId(id === selectedId ? null : id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateProposalForm() {
  const [desc, setDesc] = useState('')
  const [type, setType] = useState('0')
  const { createProposal, isPending, isSuccess } = useCreateProposal()

  const PROPOSAL_TYPES = [
    { value: '0', label: 'Umum' },
    { value: '1', label: 'Anggaran (Spend)' },
    { value: '2', label: 'Keanggotaan' },
    { value: '3', label: 'RAT Tahunan' },
    { value: '4', label: 'Lainnya' },
  ]

  const handle = () => {
    if (!desc.trim()) return
    createProposal(desc, Number(type), CONTRACTS.LAKOMI_VAULT, 0n, '0x')
    setDesc('')
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Buat Usulan Baru</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Jenis Usulan</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROPOSAL_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea placeholder="Tulis usulan Anda..." value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
        <Button onClick={handle} disabled={!desc.trim() || isPending} size="sm" className="w-full">
          {isPending ? 'Membuat...' : 'Buat Usulan'}
        </Button>
        {isSuccess && <p className="text-xs text-emerald-500">Usulan berhasil dibuat!</p>}
      </CardContent>
    </Card>
  )
}

function RATSection() {
  const { data: isRATDue } = useIsRATDue()
  const { scheduleRAT, isPending, isSuccess } = useScheduleRAT()
  const [desc, setDesc] = useState('')

  if (!isRATDue) return null

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader><CardTitle className="text-sm text-amber-500">Rapat Anggota Tahunan (RAT)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Pasal 26-27 UU 25/1992 — RAT sudah jatuh tempo dan perlu dijadwalkan</p>
        <Textarea placeholder="Agenda RAT tahunan..." value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
        <Button onClick={() => { if (desc.trim()) { scheduleRAT(desc); setDesc('') } }} disabled={!desc.trim() || isPending} size="sm" className="w-full">
          {isPending ? 'Menjadwalkan...' : 'Jadwalkan RAT'}
        </Button>
        {isSuccess && <p className="text-xs text-emerald-500">RAT berhasil dijadwalkan!</p>}
      </CardContent>
    </Card>
  )
}

function ProposalListItem({ id, selected, onClick }: { id: number; selected: boolean; onClick: () => void }) {
  const { data: state } = useProposalState(BigInt(id))
  const { data: proposalRaw } = useProposal(BigInt(id))
  const proposal = decodeProposal(proposalRaw)

  const typeLabels = ['Umum', 'Anggaran', 'Keanggotaan', 'RAT', 'Lainnya']
  const typeLabel = proposal ? typeLabels[proposal.proposalType] || 'Umum' : ''

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded-lg transition-colors text-sm flex items-center justify-between ${selected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">#{id + 1}</span>
        {proposal && <span className="text-[10px] text-muted-foreground">{typeLabel}</span>}
      </div>
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
  const { castVote, isPending: votingPending, isSuccess: voteSuccess } = useCastVote()
  const { queueProposal, isPending: queuePending, isSuccess: queueSuccess } = useQueueProposal()
  const { executeProposal, isPending: execPending, isSuccess: execSuccess } = useExecuteProposal()
  const { cancelProposal, isPending: cancelPending, isSuccess: cancelSuccess } = useCancelProposal()

  if (!proposal) return null
  const total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes
  const stateNum = state !== undefined ? Number(state) : -1

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

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
            <div><span className="text-muted-foreground/60">Pemohon:</span> {proposal.proposer.slice(0, 8)}...{proposal.proposer.slice(-4)}</div>
            <div><span className="text-muted-foreground/60">Mulai:</span> {formatTimestampShort(proposal.startTime)}</div>
            <div><span className="text-muted-foreground/60">Selesai:</span> {formatTimestampShort(proposal.endTime)}</div>
            <div><span className="text-muted-foreground/60">Tipe:</span> {['Umum', 'Anggaran', 'Keanggotaan', 'RAT', 'Lainnya'][proposal.proposalType]}</div>
          </div>

          <div className="space-y-2">
            <VoteBar label="Setuju" votes={proposal.forVotes} total={total} color="bg-emerald-500" />
            <VoteBar label="Tolak" votes={proposal.againstVotes} total={total} color="bg-red-500" />
            <VoteBar label="Abstain" votes={proposal.abstainVotes} total={total} color="bg-muted-foreground" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">Total: {total.toString()} suara</p>
        </CardContent>
      </Card>

      {stateNum === 1 && (
        <Card>
          <CardContent className="">
            <p className="text-sm font-medium mb-3">Berikan Suara</p>
            {hasVoted || voteSuccess ? (
              <p className="text-sm text-emerald-500">Anda sudah memberikan suara</p>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => castVote(id, 1)} disabled={votingPending} size="sm">Setuju</Button>
                <Button variant="destructive" onClick={() => castVote(id, 0)} disabled={votingPending} size="sm">Tolak</Button>
                <Button variant="outline" onClick={() => castVote(id, 2)} disabled={votingPending} size="sm">Abstain</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {stateNum === 4 && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="">
            <p className="text-sm font-medium text-emerald-500 mb-3">Usulan Berhasil — Siap Diantrekan</p>
            {queueSuccess ? (
              <p className="text-xs text-emerald-500">Usulan berhasil diantrikan! Tunggu periode eksekusi.</p>
            ) : (
              <Button onClick={() => queueProposal(id)} disabled={queuePending} size="sm">
                {queuePending ? 'Mengantri...' : 'Antrekan Usulan'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {stateNum === 5 && (
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="">
            <p className="text-sm font-medium text-purple-500 mb-3">Dalam Antrean — Siap Dieksekusi</p>
            {execSuccess ? (
              <p className="text-xs text-emerald-500">Usulan berhasil dieksekusi!</p>
            ) : (
              <Button onClick={() => executeProposal(id)} disabled={execPending} size="sm">
                {execPending ? 'Mengeksekusi...' : 'Eksekusi Usulan'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {(stateNum === 0 || stateNum === 1) && (
        <Card>
          <CardContent className="">
            <Button variant="outline" onClick={() => cancelProposal(id)} disabled={cancelPending} size="sm" className="text-red-400 border-red-400/30 hover:bg-red-400/10">
              {cancelPending ? 'Membatalkan...' : 'Batalkan Usulan'}
            </Button>
            {cancelSuccess && <p className="text-xs text-muted-foreground mt-2">Usulan dibatalkan</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function VoteBar({ label, votes, total, color }: { label: string; votes: bigint; total: bigint; color: string }) {
  const pct = total > 0n ? Number((votes * 100n) / total) : 0
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="text-xs text-muted-foreground w-12 sm:w-14 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-14 sm:w-20 text-right flex-shrink-0">{votes.toString()} ({pct}%)</span>
    </div>
  )
}

function EmptyState() {
  return <div className="flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Hubungkan dompet untuk berpartisipasi dalam tata kelola</p></div>
}
