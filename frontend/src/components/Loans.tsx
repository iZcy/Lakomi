import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useIsMember, useMaxLoanAmount, useBorrowerLoans, useLoan, useUsdcBalance,
  useTokenBalance, useLockedBalance, useRequiredCollateral,
} from '../hooks/useContractRead'
import {
  useRequestLoan, useRepayInFull, useRepayLoan, useApproveUsdc,
  useDisburseLoan, useApproveLoan, useMarkDefaulted, useClaimCollateral,
} from '../hooks/useContractWrite'
import { formatUSDCAmount, formatLAKAmount, parseUnits, formatTimestampShort, getLoanStateName } from '../lib/utils'
import { decodeLoan } from '../types'
import { CONTRACTS } from '../config/contracts'
import { MemberRegistration } from './MemberRegistration'

export function Loans() {
  const { address, isConnected } = useAccount()
  const { data: isMember } = useIsMember(address)
  const { data: maxLoan } = useMaxLoanAmount(address)
  const { data: loanIds } = useBorrowerLoans(address)
  const { data: usdcBal } = useUsdcBalance(address)

  if (!isConnected) return <EmptyState />
  if (!isMember) return <MemberRegistration />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Pinjaman</h2>
        <p className="text-sm text-muted-foreground mt-1">Pinjaman darurat dengan jaminan LAK (Pasal 18)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="">
            <p className="text-xs text-muted-foreground">Maks. Pinjaman</p>
            <p className="text-lg font-bold text-primary mt-1">{maxLoan ? formatUSDCAmount(maxLoan) : '0 USDC'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="">
            <p className="text-xs text-muted-foreground">Saldo USDC</p>
            <p className="text-lg font-bold mt-1">{usdcBal !== undefined ? formatUSDCAmount(usdcBal) : '0 USDC'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="">
            <p className="text-xs text-muted-foreground">Pinjaman Aktif</p>
            <p className="text-lg font-bold text-amber-500 mt-1">{loanIds ? loanIds.filter((_, i) => {
              const s = decodeLoan(useLoan(loanIds[i]).data)
              return s && s.status === 2
            }).length : 0}</p>
          </CardContent>
        </Card>
      </div>

      <RequestLoanForm maxLoan={maxLoan} usdcBal={usdcBal} />

      {loanIds && loanIds.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Pinjaman Saya</h3>
          {[...loanIds].reverse().map((id) => <LoanCard key={id.toString()} loanId={id} address={address} />)}
        </div>
      )}

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="">
          <h4 className="text-sm font-semibold text-amber-500 mb-2">Ketentuan</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>Bunga 5% APY sesuai suku bunga koperasi</li>
            <li>Jaminan 25% LAK dikunci sampai lunas</li>
            <li>Pinjaman &lt; 200 USDC disetujui otomatis</li>
            <li>Masa tenggang 7 hari setelah jatuh tempo</li>
            <li>Gagal bayar: jaminan disita oleh pengawas</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function RequestLoanForm({ maxLoan, usdcBal }: { maxLoan?: bigint; usdcBal?: bigint }) {
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
          {usdcBal !== undefined && <p className="text-[10px] text-muted-foreground">Saldo: {formatUSDCAmount(usdcBal)}</p>}
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

function LoanCard({ loanId, address }: { loanId: bigint; address?: `0x${string}` }) {
  const { data: loanRaw } = useLoan(loanId)
  const loan = decodeLoan(loanRaw)
  const { repayInFull, isPending: rPending, isSuccess: rSuccess } = useRepayInFull()
  const { repayLoan, isPending: rpPending, isSuccess: rpSuccess } = useRepayLoan()
  const { approve, isPending: ap } = useApproveUsdc()
  const { disburseLoan, isPending: dPending, isSuccess: dSuccess } = useDisburseLoan()
  const { approveLoan, isPending: alPending, isSuccess: alSuccess } = useApproveLoan()
  const { markDefaulted, isPending: mdPending, isSuccess: mdSuccess } = useMarkDefaulted()
  const { claimCollateral, isPending: ccPending, isSuccess: ccSuccess } = useClaimCollateral()
  const { data: collateralNeeded } = useRequiredCollateral(loan?.principal ?? 0n)
  const { data: lockedBal } = useLockedBalance(address)

  const [partialAmount, setPartialAmount] = useState('')
  const [showPartial, setShowPartial] = useState(false)

  if (!loan) return null
  const s = Number(loan.status)
  const colors = ['bg-yellow-500/10 text-yellow-500', 'bg-blue-500/10 text-blue-500', 'bg-emerald-500/10 text-emerald-500', 'bg-muted text-muted-foreground', 'bg-red-500/10 text-red-500', 'bg-gray-500/10 text-gray-500']

  const handleRepayFull = async () => {
    await approve(CONTRACTS.LAKOMI_LOANS, loan.remaining)
    await repayInFull(loanId)
  }

  const handlePartialRepay = async () => {
    if (!partialAmount) return
    const a = parseUnits(partialAmount)
    await approve(CONTRACTS.LAKOMI_LOANS, a)
    await repayLoan(loanId, a)
    setPartialAmount('')
    setShowPartial(false)
  }

  return (
    <Card>
      <CardContent className="">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-medium text-sm">Pinjaman #{loanId.toString()}</p>
            <p className="text-xs text-muted-foreground">{loan.reason}</p>
          </div>
          <Badge variant="outline" className={colors[s] ?? colors[5]}>{getLoanStateName(s)}</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><p className="text-[10px] text-muted-foreground">Pokok</p><p className="font-medium">{formatUSDCAmount(loan.principal)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Bunga</p><p className="font-medium">{formatUSDCAmount(loan.interest)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Total</p><p className="font-medium text-amber-500">{formatUSDCAmount(loan.totalOwed)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Jatuh Tempo</p><p className="font-medium">{formatTimestampShort(loan.dueTime)}</p></div>
        </div>
        {collateralNeeded && (
          <p className="text-[10px] text-muted-foreground mt-2">
            Jaminan: {formatLAKAmount(collateralNeeded)} {lockedBal !== undefined && `(Terkunci: {formatLAKAmount(lockedBal)})`}
          </p>
        )}
        {loan.repaidAmount > 0n && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Dibayar: {formatUSDCAmount(loan.repaidAmount)} / {formatUSDCAmount(loan.totalOwed)}
          </p>
        )}

        {s === 1 && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <Button onClick={() => disburseLoan(loanId)} disabled={dPending} className="w-full" size="sm">
              {dPending ? 'Mencairkan...' : 'Cairkan Dana'}
            </Button>
            {dSuccess && <p className="text-xs text-emerald-500">Dana berhasil dicairkan!</p>}
          </div>
        )}

        {s === 0 && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <Button onClick={() => approveLoan(loanId)} disabled={alPending} className="w-full" size="sm" variant="outline">
              {alPending ? 'Menyetujui...' : 'Setujui (Admin)'}
            </Button>
            {alSuccess && <p className="text-xs text-emerald-500">Pinjaman disetujui!</p>}
          </div>
        )}

        {s === 2 && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <Button onClick={handleRepayFull} disabled={rPending || ap} className="w-full" size="sm">
              {ap ? 'Menyetujui...' : rPending ? 'Membayar...' : `Lunasi ${formatUSDCAmount(loan.remaining)}`}
            </Button>
            {rSuccess && <p className="text-xs text-emerald-500">Lunas!</p>}

            {!showPartial ? (
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowPartial(true)}>
                Bayar Sebagian
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input type="number" placeholder="Jumlah USDC" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} className="flex-1" />
                  <Button size="sm" onClick={handlePartialRepay} disabled={!partialAmount || rpPending || ap}>
                    {rpPending ? '...' : 'Bayar'}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowPartial(false)}>Batal</Button>
                {rpSuccess && <p className="text-xs text-emerald-500">Pembayaran berhasil!</p>}
              </div>
            )}
          </div>
        )}

        {s === 2 && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <Separator />
            <p className="text-[10px] text-muted-foreground font-medium">Admin / Pengawas</p>
            <Button onClick={() => markDefaulted(loanId)} disabled={mdPending} variant="destructive" size="sm" className="w-full text-xs">
              {mdPending ? '...' : 'Tandai Gagal Bayar'}
            </Button>
            {mdSuccess && <p className="text-xs text-red-500">Ditandai gagal bayar!</p>}
          </div>
        )}

        {s === 4 && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <p className="text-[10px] text-red-500 font-medium">Pinjaman gagal bayar - jaminan dapat disita</p>
            <Button onClick={() => claimCollateral(loanId)} disabled={ccPending} variant="destructive" size="sm" className="w-full text-xs">
              {ccPending ? '...' : 'Sita Jaminan (Admin)'}
            </Button>
            {ccSuccess && <p className="text-xs text-emerald-500">Jaminan berhasil disita!</p>}
          </div>
        )}

        {s === 3 && (
          <p className="text-xs text-emerald-500 mt-2">Pinjaman telah dilunasi</p>
        )}
        {s === 5 && (
          <p className="text-xs text-muted-foreground mt-2">Pinjaman dibatalkan</p>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return <div className="flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Hubungkan dompet untuk mengajukan pinjaman</p></div>
}
