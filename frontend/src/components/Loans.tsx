import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useIsMember, useMaxLoanAmount, useBorrowerLoans, useLoan } from '../hooks/useContractRead'
import { useRequestLoan, useRepayInFull, useApproveUsdc } from '../hooks/useContractWrite'
import { formatUSDCAmount, parseUnits, formatTimestampShort, getLoanStateName } from '../lib/utils'
import { decodeLoan } from '../types'
import { CONTRACTS } from '../config/contracts'
import { MemberRegistration } from './MemberRegistration'

export function Loans() {
  const { address, isConnected } = useAccount()
  const { data: isMember } = useIsMember(address)
  const { data: maxLoan } = useMaxLoanAmount(address)
  const { data: loanIds } = useBorrowerLoans(address)

  if (!isConnected) return <EmptyState />
  if (!isMember) return <MemberRegistration />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Pinjaman</h2>
        <p className="text-sm text-muted-foreground mt-1">Ajukan pinjaman dengan jaminan token LAK</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="">
            <p className="text-xs text-muted-foreground">Plafon Maksimal</p>
            <p className="text-2xl font-bold text-emerald-500 mt-1">{maxLoan ? formatUSDCAmount(maxLoan) : '0 USDC'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="">
            <p className="text-xs text-muted-foreground">Total Pinjaman</p>
            <p className="text-2xl font-bold text-primary mt-1">{loanIds?.length?.toString() || '0'}</p>
          </CardContent>
        </Card>
      </div>

      <RequestLoanForm maxLoan={maxLoan} />

      {loanIds && loanIds.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Pinjaman Saya</h3>
          {[...loanIds].reverse().map((id) => <LoanCard key={id.toString()} loanId={id} />)}
        </div>
      )}

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="">
          <h4 className="text-sm font-semibold text-amber-500 mb-2">Ketentuan</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>Bunga berlaku sesuai suku bunga koperasi</li>
            <li>Jaminan (LAK) dikunci sampai lunas</li>
            <li>Pinjaman kecil disetujui otomatis</li>
            <li>Gagal bayar: jaminan dapat disita</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function RequestLoanForm({ maxLoan }: { maxLoan?: bigint }) {
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState('30')
  const [reason, setReason] = useState('')
  const { requestLoan, isPending, isSuccess } = useRequestLoan()
  const { approve, isPending: ap } = useApproveUsdc()

  const handle = async () => {
    if (!amount || !reason) return
    const a = parseUnits(amount)
    const secs = BigInt(duration) * 86400n
    await approve(CONTRACTS.LAKOMI_LOANS, a)
    await requestLoan(a, secs, reason)
    setAmount(''); setReason('')
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Ajukan Pinjaman</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>Jumlah (USDC)</Label>
          <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {maxLoan && <p className="text-[10px] text-muted-foreground">Maks: {formatUSDCAmount(maxLoan)}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Jangka Waktu</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 hari</SelectItem>
              <SelectItem value="60">60 hari</SelectItem>
              <SelectItem value="90">90 hari</SelectItem>
              <SelectItem value="180">180 hari</SelectItem>
              <SelectItem value="365">1 tahun</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Keperluan</Label>
          <Input placeholder="Modal usaha, Biaya pendidikan..." value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button onClick={handle} disabled={!amount || !reason || isPending || ap} className="w-full">
          {ap ? 'Menyetujui...' : isPending ? 'Mengajukan...' : 'Ajukan Pinjaman'}
        </Button>
        {isSuccess && <p className="text-xs text-emerald-500">Berhasil diajukan!</p>}
      </CardContent>
    </Card>
  )
}

function LoanCard({ loanId }: { loanId: bigint }) {
  const { data: loanRaw } = useLoan(loanId)
  const loan = decodeLoan(loanRaw)
  const { repayInFull, isPending, isSuccess } = useRepayInFull()
  const { approve, isPending: ap } = useApproveUsdc()

  if (!loan) return null
  const s = Number(loan.status)
  const colors = ['bg-yellow-500/10 text-yellow-500', 'bg-blue-500/10 text-blue-500', 'bg-emerald-500/10 text-emerald-500', 'bg-muted text-muted-foreground', 'bg-red-500/10 text-red-500']

  const handleRepay = async () => {
    await approve(CONTRACTS.LAKOMI_LOANS, loan.totalOwed)
    await repayInFull(loanId)
  }

  return (
    <Card>
      <CardContent className="">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-medium text-sm">Pinjaman #{loanId.toString()}</p>
            <p className="text-xs text-muted-foreground">{loan.reason}</p>
          </div>
          <Badge variant="outline" className={colors[s]}>{getLoanStateName(s)}</Badge>
        </div>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div><p className="text-[10px] text-muted-foreground">Pokok</p><p className="font-medium">{formatUSDCAmount(loan.principal)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Bunga</p><p className="font-medium">{formatUSDCAmount(loan.interest)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Total</p><p className="font-medium text-amber-500">{formatUSDCAmount(loan.totalOwed)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Jatuh Tempo</p><p className="font-medium">{formatTimestampShort(loan.dueTime)}</p></div>
        </div>
        {s === 2 && (
          <div className="mt-3 pt-3 border-t">
            <Button onClick={handleRepay} disabled={isPending || ap} className="w-full" size="sm">
              {ap ? 'Menyetujui...' : isPending ? 'Membayar...' : `Lunasi ${formatUSDCAmount(loan.totalOwed)}`}
            </Button>
            {isSuccess && <p className="text-xs text-emerald-500 mt-2">Lunas!</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return <div className="flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Hubungkan dompet untuk mengajukan pinjaman</p></div>
}
