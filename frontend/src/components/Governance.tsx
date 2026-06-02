import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { parseUnits, formatUnits, isAddress, encodeFunctionData, keccak256, toHex } from 'viem'
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
import { LAKOMI_TOKEN_ABI, LAKOMI_GOVERN_ABI } from '../abis'
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

      <PemiluSection address={address} />
    </div>
  )
}

function CreateProposalForm() {
  const [desc, setDesc] = useState('')
  const [type, setType] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [memberAddr, setMemberAddr] = useState('')
  const { createProposal, isPending, isSuccess } = useCreateProposal()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] })
      setDesc(''); setType(''); setRecipient(''); setAmount(''); setMemberAddr('')
    }
  }, [isSuccess, queryClient])

  const PROPOSAL_TYPES = [
    { value: '0', label: 'Anggaran (Belanja)', desc: 'Usulkan pengeluaran dana koperasi', needsRecipient: true, needsAmount: true },
    { value: '2', label: 'Keanggotaan', desc: 'Usulkan pemberhentian anggota (Pasal 31 UU 25/1992)', needsMember: true },
    { value: '3', label: 'RAT Tahunan', desc: 'Rapat Anggota Tahunan (Pasal 26-27)' },
    { value: '4', label: 'Pembubaran', desc: 'Usulkan pembubaran koperasi (Pasal 33-35)', needsDissolution: true },
  ]

  const memberList = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem('lakomi_members') || '{}')
      return Object.entries(stored).map(([addr, data]: [string, any]) => ({
        addr,
        name: (data?.namaLengkap || '') ? `${data.namaLengkap} (${addr.slice(0,6)}...${addr.slice(-4)})` : `${addr.slice(0,8)}...${addr.slice(-4)}`,
      }))
    } catch { return [] }
  })()

  const selectedType = PROPOSAL_TYPES.find(t => t.value === type)
  const needsRecipient = selectedType?.needsRecipient ?? false
  const needsAmount = selectedType?.needsAmount ?? false
  const needsMember = selectedType?.needsMember ?? false
  const needsDissolution = selectedType?.needsDissolution ?? false

  const isRecipientValid = !needsRecipient || (recipient && isAddress(recipient))
  const isAmountValid = !needsAmount || (amount && !isNaN(Number(amount)) && Number(amount) > 0)
  const isMemberValid = !needsMember || (memberAddr && isAddress(memberAddr))
  const canSubmit = desc.trim() && type && isRecipientValid && isAmountValid && isMemberValid

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
    } else if (type === '2' && isAddress(memberAddr)) {
      targetAddr = CONTRACTS.LAKOMI_TOKEN
      callData = encodeFunctionData({
        abi: LAKOMI_TOKEN_ABI,
        functionName: 'revokeMembership',
        args: [memberAddr as `0x${string}`],
      })
    } else if (type === '4') {
      targetAddr = CONTRACTS.LAKOMI_GOVERN
      callData = '0x'
    } else {
      targetAddr = CONTRACTS.LAKOMI_VAULT
      callData = '0x'
    }

    createProposal(desc, Number(type), targetAddr, callValue, callData)
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
            <label className="text-xs text-muted-foreground">Penerima *</label>
            <Select value={recipient} onValueChange={setRecipient}>
              <SelectTrigger><SelectValue placeholder="Pilih penerima" /></SelectTrigger>
              <SelectContent>
                {memberList.map((m) => (
                  <SelectItem key={m.addr} value={m.addr}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        {needsMember && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Anggota *</label>
            <Select value={memberAddr} onValueChange={setMemberAddr}>
              <SelectTrigger><SelectValue placeholder="Pilih anggota" /></SelectTrigger>
              <SelectContent>
                {memberList.map((m) => (
                  <SelectItem key={m.addr} value={m.addr}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {memberList.length === 0 && (
              <p className="text-[10px] text-muted-foreground">Belum ada anggota terdaftar</p>
            )}
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
  const { castVote, isPending: votingPending, isSuccess: voteSuccess, error: voteErr } = useCastVote()
  const { queueProposal, isPending: queuePending, isSuccess: queueSuccess, error: queueErr } = useQueueProposal()
  const { executeProposal, isPending: execPending, isSuccess: execSuccess, error: execError } = useExecuteProposal()
  const { cancelProposal, isPending: cancelPending, isSuccess: cancelSuccess, error: cancelErr } = useCancelProposal()
  const govError = voteErr || queueErr || execError || cancelErr
  const queryClient = useQueryClient()

  useEffect(() => {
    if (voteSuccess || queueSuccess || execSuccess || cancelSuccess) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] })
    }
    if (execSuccess && callData && callData.length >= 68) {
      try {
        const kicked = ('0x' + callData.slice(-40)) as `0x${string}`
        const stored = JSON.parse(localStorage.getItem('lakomi_members') || '{}')
        if (stored[kicked.toLowerCase()]) {
          delete stored[kicked.toLowerCase()]
          localStorage.setItem('lakomi_members', JSON.stringify(stored))
        }
      } catch {}
    }
  }, [voteSuccess, queueSuccess, execSuccess, cancelSuccess, queryClient, callData])

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

          {proposal.proposalType === 2 && callData && callData.length >= 68 && (
            <div className="bg-red-500/10 rounded-md p-3 mb-4">
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">Pemberhentian Anggota</p>
              <p className="text-xs font-mono text-red-400">{'0x' + callData.slice(-40)}</p>
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
            {execError && (
              <p className="text-[10px] text-red-400 mt-1">{(execError as any)?.shortMessage || 'Eksekusi gagal'}</p>
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
      {govError && (
        <p className="text-[10px] text-red-400 mt-2">{(govError as any)?.shortMessage || 'Transaksi gagal'}</p>
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

const ELECTION_ROLES = [
  { key: 'APPROVER_ROLE', label: 'Pengurus', desc: 'Menyetujui pinjaman anggota', contract: 'LAKOMI_LOANS' },
  { key: 'TREASURER_ROLE', label: 'Bendahara', desc: 'Mengelola treasury koperasi', contract: 'LAKOMI_VAULT' },
  { key: 'PENGAWAS_ROLE', label: 'Pengawas', desc: 'Mengawasi kebijakan dan pengelolaan', contract: 'LAKOMI_GOVERN' },
]

function PemiluSection({ address }: { address?: `0x${string}` }) {
  const [selectedRole, setSelectedRole] = useState('')
  const [candidate, setCandidate] = useState('')
  const [regDays, setRegDays] = useState('3')
  const [voteDays, setVoteDays] = useState('5')
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()

  const { data: isAdmin } = useReadContract({
    address: CONTRACTS.LAKOMI_GOVERN as `0x${string}`,
    abi: LAKOMI_GOVERN_ABI,
    functionName: 'hasRole',
    args: [keccak256(toHex('DEFAULT_ADMIN_ROLE')), address!],
    query: { enabled: !!address },
  })
  const elected = ELECTION_ROLES.find(r => r.key === selectedRole)
  const roleHash = elected ? keccak256(toHex(elected.key)) : '0x'

  const { data: election, refetch } = useReadContract({
    address: CONTRACTS.LAKOMI_GOVERN as `0x${string}`,
    abi: LAKOMI_GOVERN_ABI,
    functionName: 'getElection',
    args: [roleHash],
    query: { enabled: !!elected },
  })

  const eData = election as any
  const hasElection = eData && eData[0] > 0n

  const { data: isCandidate } = useReadContract({
    address: CONTRACTS.LAKOMI_GOVERN as `0x${string}`,
    abi: LAKOMI_GOVERN_ABI,
    functionName: 'isCandidate',
    args: [roleHash, address!],
    query: { enabled: !!elected && !!address },
  })

  const call = async (fn: string, args: any[]) => {
    try {
      await writeContractAsync({
        address: CONTRACTS.LAKOMI_GOVERN as `0x${string}`,
        abi: LAKOMI_GOVERN_ABI,
        functionName: fn,
        args,
      })
      queryClient.invalidateQueries({ queryKey: ['readContract'] })
      setTimeout(() => refetch(), 2000)
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || ''
      if (!msg.includes('rejected')) alert('Gagal: ' + msg)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Pemilihan Pengurus (Pasal 29-30, 38)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[10px] text-muted-foreground">Pilih jabatan → admin mulai pemilu → kandidat daftar → anggota vote → finalisasi. Pemenang otomatis dapat role.</p>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger><SelectValue placeholder="Pilih jabatan">{elected?.label}</SelectValue></SelectTrigger>
          <SelectContent>
            {ELECTION_ROLES.map(r => (
              <SelectItem key={r.key} value={r.key}>{r.label} — {r.desc}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {elected && !hasElection && (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">Belum ada pemilu untuk {elected.label}.</p>
            {isAdmin ? (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-muted-foreground">Pendaftaran (hari)</label>
                  <Input type="number" placeholder="3" value={regDays} onChange={e => setRegDays(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-muted-foreground">Voting (hari)</label>
                  <Input type="number" placeholder="5" value={voteDays} onChange={e => setVoteDays(e.target.value)} className="h-8 text-xs" />
                </div>
                <Button size="sm" className="text-xs" onClick={() => call('beginElection', [roleHash, BigInt(regDays) * 86400n, BigInt(voteDays) * 86400n])}>
                  Mulai Pemilu
                </Button>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground italic">Butuh akses Admin untuk memulai pemilu.</p>
            )}

          </div>
        )}

        {hasElection && (
          <div className="space-y-2 bg-muted/30 rounded p-2 text-xs">
            <p><span className="font-semibold">Pemilu {elected.label}</span> — #{String(eData[0])}</p>
            <p>Pendaftaran: {new Date(Number(eData[2]) * 1000).toLocaleDateString()}</p>
            <p>Voting sampai: {new Date(Number(eData[3]) * 1000).toLocaleDateString()}</p>
            <p>Status: {eData[4] ? '✅ Selesai — Pemenang: ' + String(eData[5]?.slice(0,10)) + '... (' + String(eData[6]) + ' suara)' : '🔄 Aktif'}</p>

            {!eData[4] && (
              <div className="space-y-2">
                {!isCandidate && (
                  <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => call('registerAsCandidate', [roleHash])}>Daftar Sebagai Kandidat</Button>
                )}
                <div className="flex gap-2">
                  <Input placeholder="Alamat kandidat" value={candidate} onChange={e => setCandidate(e.target.value)} className="h-8 text-xs font-mono flex-1" />
                  <Button size="sm" className="text-xs" disabled={!isAddress(candidate)} onClick={() => call('castElectionVote', [roleHash, candidate])}>Vote</Button>
                </div>
              </div>
            )}
            {Date.now() / 1000 > Number(eData[3]) && !eData[4] && (
              <Button size="sm" className="text-xs w-full mt-1" variant="outline" onClick={() => call('finalizeElection', [roleHash])}>Finalisasi Pemilu</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return <div className="flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Hubungkan dompet untuk berpartisipasi dalam tata kelola</p></div>
}
