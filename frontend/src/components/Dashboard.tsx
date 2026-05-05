import { useAccount } from 'wagmi'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useIsMember, useVotingPower, useTokenBalance, useMemberCount, useSimpananSummary, useTotalAssets, usePendingSHU } from '../hooks/useContractRead'
import { formatUSDCAmount, formatLAKAmount, shortenAddress } from '../lib/utils'
import { decodeSummary } from '../types'
import { MemberRegistration } from './MemberRegistration'
import { DevFaucet } from './DevFaucet'

export function Dashboard() {
  const { address, isConnected, chainId } = useAccount()
  const { data: isMember, error: memberErr } = useIsMember(address)
  const { data: votingPower } = useVotingPower(address)
  const { data: tokenBalance } = useTokenBalance(address)
  const { data: memberCount } = useMemberCount()
  const { data: summaryRaw } = useSimpananSummary(address)
  const s = decodeSummary(summaryRaw)
  const { data: totalAssets } = useTotalAssets()
  const { data: pendingSHU } = usePendingSHU(address)

  console.log('Dashboard state:', { address, isConnected, chainId, isMember, memberErr: memberErr?.message, memberCount: memberCount?.toString() })

  if (memberErr) {
    console.error('Member check error:', memberErr)
  }

  if (isConnected && memberErr) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="">
            <h3 className="text-sm font-semibold text-destructive mb-2">Gagal Membaca Kontrak</h3>
            <p className="text-xs text-muted-foreground mb-2">{memberErr.message}</p>
            <p className="text-xs text-muted-foreground">Pastikan dompet terhubung ke jaringan Anvil (Chain ID 31337, RPC http://127.0.0.1:8545)</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isConnected && isMember === undefined && !memberErr) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="">
            <p className="text-sm text-muted-foreground">Selamat datang</p>
            <p className="text-lg font-bold font-mono mt-0.5">{shortenAddress(address || '')}</p>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground animate-pulse">Memuat data koperasi...</p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <div className="p-4 bg-muted rounded-2xl mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1">Hubungkan Dompet</h2>
            <p className="text-sm text-muted-foreground text-center">Hubungkan dompet Anda untuk mengakses layanan koperasi digital</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">Selamat datang</p>
            <p className="text-base sm:text-lg font-bold font-mono mt-0.5">{shortenAddress(address || '')}</p>
          </div>
          {isMember && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">Anggota Terdaftar</Badge>}
        </CardContent>
      </Card>

      {!isMember && <MemberRegistration />}

      <DevFaucet />

      {isMember && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Hak Suara" value={votingPower !== undefined && votingPower > 0n ? '1 Suara' : '0'} desc="1 anggota = 1 suara" />
            <StatCard label="Saldo LAK" value={tokenBalance !== undefined ? formatLAKAmount(tokenBalance) : '0 LAK'} desc="Token keanggotaan" />
            <StatCard label="Total Simpanan" value={s ? formatUSDCAmount(s.totalContribution) : '0 USDC'} desc="Pokok + Wajib + Sukarela" />
            <StatCard label="SHU Menunggu" value={pendingSHU !== undefined && pendingSHU > 0n ? formatUSDCAmount(pendingSHU) : '0 USDC'} desc="Sisa Hasil Usaha" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <CardContent className="">
                <p className="text-sm text-muted-foreground">Total Anggota</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary mt-1">{memberCount?.toString() || '0'}</p>
                <p className="text-xs text-muted-foreground mt-1">Anggota terdaftar</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="">
                <p className="text-sm text-muted-foreground">Total Aset Koperasi</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-500 mt-1">{totalAssets !== undefined ? formatUSDCAmount(totalAssets) : '0 USDC'}</p>
                <p className="text-xs text-muted-foreground mt-1">Dana yang dikelola</p>
              </CardContent>
            </Card>
          </div>

          {s && (
            <Card>
              <CardContent className="">
                <p className="text-sm font-semibold mb-3">Rincian Simpanan Anda</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><p className="text-xs text-muted-foreground">Simpanan Pokok</p><p className="text-lg font-bold text-foreground mt-1">{formatUSDCAmount(s.pokok)}</p><p className="text-[10px] text-muted-foreground">Pasal 41(1)</p></div>
                  <div><p className="text-xs text-muted-foreground">Simpanan Wajib</p><p className="text-lg font-bold text-foreground mt-1">{formatUSDCAmount(s.wajibTotal)}</p><p className="text-[10px] text-muted-foreground">{s.wajibPeriodsPaid.toString()}x dibayar</p></div>
                  <div><p className="text-xs text-muted-foreground">Simpanan Sukarela</p><p className="text-lg font-bold text-emerald-500 mt-1">{formatUSDCAmount(s.sukarela)}</p><p className="text-[10px] text-muted-foreground">Pasal 41(3)</p></div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <Card>
      <CardContent className="">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base sm:text-xl font-bold mt-1">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
      </CardContent>
    </Card>
  )
}
