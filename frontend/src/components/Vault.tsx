import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  useIsMember, useHasPaidPokok, useSimpananSummary, useTotalAssets,
  usePendingSHU, useAccumulatedRevenue, useUsdcBalance, useSimpananPokokAmount, useSimpananWajibAmount,
  useShuDistributionCount, useShuDistribution,
} from '../hooks/useContractRead'
import {
  useDeposit, usePaySimpananPokok, usePaySimpananWajib, useClaimSHU, useApproveUsdc, useDistributeSHU,
} from '../hooks/useContractWrite'
import { formatUSDCAmount, parseUnits, formatTimestamp } from '../lib/utils'
import { decodeSummary } from '../types'
import { CONTRACTS } from '../config/contracts'
import { MemberRegistration, PaySimpananPokokPrompt } from './MemberRegistration'

export function Vault() {
  const { address, isConnected } = useAccount()
  const { data: isMember } = useIsMember(address)
  const { data: hasPaid } = useHasPaidPokok(address)
  const { data: summaryRaw } = useSimpananSummary(address)
  const s = decodeSummary(summaryRaw)
  const { data: totalAssets } = useTotalAssets()
  const { data: pendingSHU } = usePendingSHU(address)
  const { data: revenue } = useAccumulatedRevenue()
  const { data: usdcBal } = useUsdcBalance(address)
  const { data: pokokAmount } = useSimpananPokokAmount()
  const { data: wajibAmount } = useSimpananWajibAmount()

  if (!isConnected) return <EmptyState />
  if (!isMember) return <MemberRegistration />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Simpanan</h2>
        <p className="text-sm text-muted-foreground mt-1">Kelola simpanan sesuai Pasal 41 UU 25/1992</p>
      </div>

      <PaySimpananPokokPrompt />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="">
            <p className="text-xs text-muted-foreground">Total Simpanan</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-500 mt-1">{s ? formatUSDCAmount(s.totalContribution) : '0 USDC'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="">
            <p className="text-xs text-muted-foreground">Saldo USDC</p>
            <p className="text-xl sm:text-2xl font-bold mt-1">{usdcBal !== undefined ? formatUSDCAmount(usdcBal) : '0 USDC'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="">
            <p className="text-xs text-muted-foreground">SHU Menunggu</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-500 mt-1">{pendingSHU && pendingSHU > 0n ? formatUSDCAmount(pendingSHU) : '0 USDC'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {!hasPaid && pokokAmount && (
            <Card className="border-amber-500/20">
              <CardHeader><CardTitle className="text-sm text-amber-500">Bayar Simpanan Pokok</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Sekali seumur hidup ({formatUSDCAmount(pokokAmount)})</p>
                <PaySimpananPokokButton address={address} amount={pokokAmount} />
              </CardContent>
            </Card>
          )}
          {hasPaid && wajibAmount && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Bayar Simpanan Wajib</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Periodik ({formatUSDCAmount(wajibAmount)}/periode)</p>
                <PaySimpananWajibButton />
              </CardContent>
            </Card>
          )}
          {hasPaid && <DepositForm usdcBal={usdcBal} />}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Rincian Simpanan</CardTitle></CardHeader>
            <CardContent>
              {s ? (
                <div className="space-y-2">
                  <Row label="Simpanan Pokok" value={formatUSDCAmount(s.pokok)} sub="Pasal 41(1)" />
                  <Row label="Simpanan Wajib" value={formatUSDCAmount(s.wajibTotal)} sub={`${s.wajibPeriodsPaid.toString()}x periode`} />
                  <Row label="Simpanan Sukarela" value={formatUSDCAmount(s.sukarela)} sub="Pasal 41(3)" />
                  <Separator />
                  <Row label="Total" value={formatUSDCAmount(s.totalContribution)} bold />
                </div>
              ) : <p className="text-sm text-muted-foreground">Belum ada data</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="">
              <p className="text-xs text-muted-foreground">Pendapatan Koperasi</p>
              <p className="text-xl font-bold text-primary mt-1">{revenue ? formatUSDCAmount(revenue) : '0 USDC'}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Akan didistribusikan sebagai SHU (Pasal 45)</p>
              {revenue && revenue > 0n && <DistributeSHUButton />}
            </CardContent>
          </Card>
        </div>
      </div>

      <SHUHistory address={address} />
    </div>
  )
}

function SHUHistory({ address }: { address?: `0x${string}` }) {
  const { data: count } = useShuDistributionCount()
  const distCount = count ? Number(count) : 0

  if (distCount === 0) return null

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Riwayat Distribusi SHU</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[...Array(distCount)].reverse().map((_, i) => (
            <SHUDistributionRow key={i} distId={BigInt(distCount - 1 - i)} address={address} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function SHUDistributionRow({ distId, address }: { distId: bigint; address?: `0x${string}` }) {
  const { data: distRaw } = useShuDistribution(distId)
  const { claimSHU, isPending, isSuccess } = useClaimSHU()

  if (!distRaw) return null
  const d = distRaw as [bigint, bigint, bigint, bigint, bigint]
  const totalAmount = d[0]
  const memberCount = d[1]
  const timestamp = d[2]
  const perShare = d[3]
  const claimedCount = d[4]

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
      <div>
        <p className="font-medium">SHU #{Number(distId) + 1}</p>
        <p className="text-[10px] text-muted-foreground">{formatTimestamp(timestamp)} | {memberCount.toString()} anggota</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Total: {formatUSDCAmount(totalAmount)}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-1 text-[10px] h-6 px-2"
          onClick={() => claimSHU(distId)}
          disabled={isPending || isSuccess}
        >
          {isPending ? 'Mengklaim...' : isSuccess ? 'Sudah' : 'Klaim'}
        </Button>
      </div>
    </div>
  )
}

function DistributeSHUButton() {
  const { distributeSHU, isPending, isSuccess } = useDistributeSHU()
  return (
    <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => distributeSHU()} disabled={isPending}>
      {isPending ? 'Mendistribusikan...' : isSuccess ? 'Terdistribusi' : 'Distribusikan SHU'}
    </Button>
  )
}

function DepositForm({ usdcBal }: { usdcBal?: bigint }) {
  const [amount, setAmount] = useState('')
  const { deposit, isPending: d1, isSuccess: s1 } = useDeposit()
  const { approve, isPending: d2 } = useApproveUsdc()

  const handle = async () => {
    if (!amount) return
    const a = parseUnits(amount)
    await approve(CONTRACTS.LAKOMI_VAULT, a)
    await deposit(a)
    setAmount('')
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Simpanan Sukarela</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Setor kapan saja, eligible untuk SHU</p>
        <div className="space-y-1.5">
          <Label htmlFor="deposit">Jumlah USDC</Label>
          <Input id="deposit" type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {usdcBal !== undefined && <p className="text-[10px] text-muted-foreground">Saldo: {formatUSDCAmount(usdcBal)}</p>}
        </div>
        <Button onClick={handle} disabled={!amount || d1 || d2} className="w-full">
          {d2 ? 'Menyetujui...' : d1 ? 'Menyetor...' : 'Setor'}
        </Button>
        {s1 && <p className="text-xs text-emerald-500">Berhasil disetor!</p>}
      </CardContent>
    </Card>
  )
}

function PaySimpananPokokButton({ address, amount }: { address?: `0x${string}`; amount: bigint }) {
  const { paySimpananPokok, isPending, isSuccess } = usePaySimpananPokok()
  return (
    <>
      <Button onClick={() => address && paySimpananPokok(address)} disabled={isPending} className="w-full">
        {isPending ? 'Memproses...' : `Bayar ${formatUSDCAmount(amount)}`}
      </Button>
      {isSuccess && <p className="text-xs text-emerald-500 mt-2">Simpanan Pokok berhasil dibayar!</p>}
    </>
  )
}

function PaySimpananWajibButton() {
  const { paySimpananWajib, isPending, isSuccess } = usePaySimpananWajib()
  return (
    <>
      <Button onClick={() => paySimpananWajib()} disabled={isPending} className="w-full">Bayar</Button>
      {isSuccess && <p className="text-xs text-emerald-500 mt-2">Simpanan Wajib berhasil!</p>}
    </>
  )
}

function Row({ label, value, sub, bold }: { label: string; value: string; sub?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm ${bold ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
      <p className={`text-sm ${bold ? 'font-bold text-emerald-500' : ''}`}>{value}</p>
    </div>
  )
}

function EmptyState() {
  return <div className="flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Hubungkan dompet untuk mengelola simpanan</p></div>
}
