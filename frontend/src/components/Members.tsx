import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useReadContract } from 'wagmi'
import { keccak256, toHex } from 'viem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CONTRACTS } from '../config/contracts'
import { useMemberCount, useIsMember } from '../hooks/useContractRead'
import { useResignMembership } from '../hooks/useContractWrite'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'

const ROLES: { key: string; label: string; color: string; contract: string }[] = [
  { key: 'PENGAWAS_ROLE', label: 'Pengawas', color: 'bg-red-500', contract: 'LAKOMI_GOVERN' },
  { key: 'APPROVER_ROLE', label: 'Pengurus', color: 'bg-blue-500', contract: 'LAKOMI_LOANS' },
  { key: 'MEMBERSHIP_ROLE', label: 'Membership', color: 'bg-purple-500', contract: 'LAKOMI_TOKEN' },
  { key: 'TREASURER_ROLE', label: 'Bendahara', color: 'bg-amber-500', contract: 'LAKOMI_VAULT' },
  { key: 'DEFAULT_ADMIN_ROLE', label: 'Admin', color: 'bg-emerald-500', contract: 'LAKOMI_TOKEN' },
]

function useHasRole(address: string | undefined, roleKey: string, contractKey: string) {
  const roleHash = keccak256(toHex(roleKey))
  return useReadContract({
    address: (CONTRACTS as any)[contractKey] as `0x${string}`,
    abi: [{ type: 'function', name: 'hasRole', stateMutability: 'view', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [{ type: 'bool' }] }],
    functionName: 'hasRole',
    args: [roleHash, address as `0x${string}`],
    query: { enabled: !!address },
  })
}

function RoleCheck({ address, roleKey, label, color, contractKey }: { address?: string; roleKey: string; label: string; color: string; contractKey: string }) {
  const { data: hasRole } = useHasRole(address, roleKey, contractKey)
  if (!hasRole) return null
  return <Badge className={`text-[10px] ${color} text-white`}>{label}</Badge>
}

function MemberCard({ addr, name }: { addr: string; name: string | null }) {
  const { data: isMember } = useIsMember(addr as `0x${string}`)
  if (!isMember) return null
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md">
      <div>
        <p className="text-sm font-medium">{name || addr.slice(0, 10) + '...' + addr.slice(-4)}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{addr}</p>
      </div>
      <div className="flex gap-1">
        {ROLES.map(r => (
          <RoleCheck key={r.key} address={addr} roleKey={r.key} label={r.label} color={r.color} contractKey={r.contract} />
        ))}
      </div>
    </div>
  )
}

export function Members() {
  const { address, isConnected } = useAccount()
  const { data: count } = useMemberCount()
  const { data: isMember } = useIsMember(address)
  const { resignMembership, isPending: resigning, isSuccess: resigned } = useResignMembership()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (resigned) queryClient.invalidateQueries({ queryKey: ['readContract'] })
  }, [resigned, queryClient])

  const [memberList, setMemberList] = useState<{ addr: string; name: string }[]>([])
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('lakomi_members') || '{}')
      const list = Object.entries(stored).map(([addr, data]: [string, any]) => ({
        addr,
        name: data?.namaLengkap || null,
      }))
      setMemberList(list)
    } catch {
      setMemberList([])
    }
  }, [])

  if (!isConnected) return <p className="text-sm text-muted-foreground p-4">Hubungkan dompet untuk melihat anggota.</p>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profil & Role Anda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-mono">{address}</p>
              <p className="text-xs text-muted-foreground">Total Anggota Koperasi: {count?.toString() || '...'}</p>
            </div>
            <div className="flex gap-1">
              {ROLES.map(r => (
                <RoleCheck key={r.key} address={address} roleKey={r.key} label={r.label} color={r.color} contractKey={r.contract} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Daftar Anggota</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {memberList.length === 0 && (
            <p className="text-xs text-muted-foreground">Belum ada anggota terdaftar.</p>
          )}
          {memberList.map(m => (
            <MemberCard key={m.addr} addr={m.addr} name={m.name} />
          ))}
        </CardContent>
      </Card>

      {isMember && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader><CardTitle className="text-sm text-red-500">Keluar dari Koperasi</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Mengundurkan diri secara sukarela (Pasal 19-21). Simpanan pokok akan dikembalikan. Token LAK dibakar. Syarat: tidak ada pinjaman aktif.
            </p>
            <Button variant="destructive" size="sm" onClick={() => resignMembership()} disabled={resigning || resigned}>
              {resigning ? 'Memproses...' : resigned ? 'Berhasil Keluar' : 'Keluar dari Koperasi'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
