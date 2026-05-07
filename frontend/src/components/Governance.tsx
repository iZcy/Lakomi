import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { parseUnits, formatUnits, isAddress, encodeFunctionData } from 'viem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useIsMember, useProposalCount, useProposal, useProposalState, useHasVoted, useProposalTarget, useProposalValue, useProposalCallData } from '../hooks/useContractRead'
import { useCreateProposal, useCastVote, useQueueProposal, useExecuteProposal, useCancelProposal } from '../hooks/useContractWrite'
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
          {selectedId !== null && (
            <ProposalDetail id={BigInt(selectedId)} address={address} />
          )}
        </div>
      </div>
    </div>
  )
}

function CreateProposalForm() {
  const [desc, setDesc] = useState('')
  const [type, setType] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const { createProposal, isPending, isSuccess } = useCreateProposal()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] })
      setDesc(''); setType(''); setRecipient(''); setAmount('')
    }
  }, [isSuccess, queryClient])

  const PROPOSAL_TYPES = [
    { value: '0', label: 'Anggaran (Belanja)', desc: 'Usulkan pengeluaran dana koperasi', needsRecipient: true, needsAmount: true },
    { value: '2', label: 'Keanggotaan', desc: 'Usulkan pemberhentian anggota (Pasal 31 UU 25/1992)' },
    { value: '3', label: 'RAT Tahunan', desc: 'Rapat Anggota Tahunan (Pasal 26-27)' },
  ]

  const selectedType = PROPOSAL_TYPES.find(t => t.value === type)
  const needsRecipient = selectedType?.needsRecipient ?? false
  const needsAmount = selectedType?.needsAmount ?? false

  const isRecipientValid = !needsRecipient || (recipient && isAddress(recipient))
  const isAmountValid = !needsAmount || (amount && !isNaN(Number(amount)) && Number(amount) > 0)
  const canSubmit = desc.trim() && type && isRecipientValid && isAmountValid

  const handle = () => {
    if (!canSubmit) return

    let targetAddr: `0x${string}`
    const callValue = 0n
    let callData: `0x${string}`

    if (type === '0') {
      targetAddr = CONTRACTS.LAKOMI_VAULT
      const usdcAmount = parseUnits(amount, 6)
      const reasonHex = `0x${Array.from(new TextEncoder().encode(desc.trim())).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`
      callData = encodeFunctionData({
        abi: [{
          name: 'governanceSpend',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'reason', type: 'bytes' }
          ]
        }],
        functionName: 'governanceSpend',
        args: [recipient as `0x${string}`, usdcAmount, reasonHex]
      })
    } else {
      targetAddr = CONTRACTS.LAKOMI_VAULT
      callData = '0x'
    }

    createProposal(desc, Number(type), targetAddr, callValue, callData)
    setDesc(''); setType(''); setRecipient(''); setAmount('')
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Buat Usulan Baru</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Jenis Usulan *</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih jenis usulan">
                {type ? PROPOSAL_TYPES.find(t => t.value === type)?.label : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PROPOSAL_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedType && (
            <p className="text-[10px] text-muted-foreground">{selectedType.desc}</p>
          )}
        </div>

        {needsRecipient && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Penerima USDC *</label>
            <Input
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="text-xs font-mono"
            />
            {recipient && !isAddress(recipient) && (
              <p className="text-[10px] text-red-400">Alamat tidak valid</p>
            )}
          </div>
        )}

        {needsAmount && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Jumlah (USDC) *</label>
            <Input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.001"
            />
          </div>
        )}

        <Textarea placeholder="Tulis usulan Anda..." value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
        <Button onClick={handle} disabled={!canSubmit || isPending} size="sm" className="w-full">
          {isPending ? 'Membuat...' : 'Buat Usulan'}
        </Button>
        {isSuccess && <p className="text-xs text-emerald-500">Usulan berhasil dibuat!</p>}
      </CardContent>
    </Card>
  )
}

function ProposalListItem({ id, selected, onClick }: { id: number; selected: boolean; onClick: () => void }) {
  const { data: state } = useProposalState(BigInt(id))
  const { data: proposalRaw } = useProposal(BigInt(id))
  const proposal = decodeProposal(proposalRaw)

  const typeLabels = ['Anggaran', 'Anggaran', 'Keanggotaan', 'RAT', 'Lainnya']
  const typeLabel = proposal ? typeLabels[proposal.proposalType] || 'Anggaran' : ''

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
  const { data: target } = useProposalTarget(id)
  const { data: value } = useProposalValue(id)
  const { data: callData } = useProposalCallData(id)
  const { castVote, isPending: votingPending, isSuccess: voteSuccess } = useCastVote()
  const { queueProposal, isPending: queuePending, isSuccess: queueSuccess } = useQueueProposal()
  const { executeProposal, isPending: execPending, isSuccess: execSuccess } = useExecuteProposal()
  const { cancelProposal, isPending: cancelPending, isSuccess: cancelSuccess } = useCancelProposal()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (voteSuccess || queueSuccess || execSuccess || cancelSuccess) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] })
    }
  }, [voteSuccess, queueSuccess, execSuccess, cancelSuccess, queryClient])

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs text-muted-foreground mb-4">
            <div><span className="text-muted-foreground/60">Pemohon:</span> {proposal.proposer.slice(0, 8)}...{proposal.proposer.slice(-4)}</div>
            <div><span className="text-muted-foreground/60">Tipe:</span> {['Anggaran', 'Anggaran', 'Keanggotaan', 'RAT', 'Lainnya'][proposal.proposalType]}</div>
            <div><span className="text-muted-foreground/60">Mulai:</span> {formatTimestampShort(proposal.startTime)}</div>
            <div><span className="text-muted-foreground/60">Selesai:</span> {formatTimestampShort(proposal.endTime)}</div>
          </div>

          {(proposal.proposalType === 0 || proposal.proposalType === 1 || proposal.proposalType === 4) && target && (
            <div className="bg-muted/40 rounded-md p-3 mb-4 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Aksi Usulan</p>
              <div className="text-xs space-y-1">
                <div><span className="text-muted-foreground/60">Alamat Tujuan:</span> <span className="font-mono">{target}</span></div>
                {value !== undefined && value > 0n && (
                  <div><span className="text-muted-foreground/60">Nilai Transfer:</span> <span className="font-semibold">{formatUnits(value, 6)} USDC</span></div>
                )}
                {callData && callData !== '0x' && (
                  <div><span className="text-muted-foreground/60">Data Panggilan:</span> <span className="font-mono text-[10px]">{callData.slice(0, 20)}...</span></div>
                )}
              </div>
            </div>
          )}

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
              <div className="flex flex-wrap gap-2">
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
