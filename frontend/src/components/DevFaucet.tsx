import { useState } from 'react'
import { useAccount, useBalance, useWalletClient, useSendTransaction } from 'wagmi'
import { parseEther, encodeFunctionData, parseAbi, keccak256, toHex } from 'viem'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from './Toast'
import { anvil } from '../wagmi'
import { CONTRACTS } from '../config/contracts'
import { LAKOMI_TOKEN_ABI } from '../abis/LakomiToken'
import { useQueryClient } from '@tanstack/react-query'

const parsedTokenAbi = parseAbi(LAKOMI_TOKEN_ABI)

const RPC = typeof import.meta.env.VITE_RPC_URL === 'string'
  ? import.meta.env.VITE_RPC_URL
  : 'http://127.0.0.1:8545'

const DEPLOYER = typeof import.meta.env.VITE_DEPLOYER_URL === 'string'
  ? import.meta.env.VITE_DEPLOYER_URL
  : 'http://localhost:3030'

const DEPLOYER_ADDR = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

async function rpcCall(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'RPC error')
  return json.result
}

function encodeMint(to: string, amount: bigint): string {
  const sel = '40c10f19'
  const addr = to.toLowerCase().replace('0x', '').padStart(64, '0')
  const val = amount.toString(16).padStart(64, '0')
  return '0x' + sel + addr + val
}

const ROLES: { key: string; label: string; desc: string }[] = [
  { key: 'DEFAULT_ADMIN_ROLE', label: 'Admin', desc: 'Full access to begin elections' },
  { key: 'PENGAWAS_ROLE', label: 'Pengawas', desc: 'Veto proposals, pause governance' },
  { key: 'APPROVER_ROLE', label: 'Pengurus', desc: 'Approve loans, mark defaulted' },
  { key: 'MEMBERSHIP_ROLE', label: 'Membership', desc: 'Register/revoke members' },
  { key: 'TREASURER_ROLE', label: 'Bendahara', desc: 'Vault admin' },
]

const CONTRACTS_TO_GRANT: Record<string, string> = {
  DEFAULT_ADMIN_ROLE: 'LAKOMI_GOVERN',
  PENGAWAS_ROLE: 'LAKOMI_GOVERN',
  APPROVER_ROLE: 'LAKOMI_LOANS',
  MEMBERSHIP_ROLE: 'LAKOMI_TOKEN',
  TREASURER_ROLE: 'LAKOMI_VAULT',
}

export function DevFaucet() {
  const { address, chainId } = useAccount()
  const { refetch: refetchBalance } = useBalance({ address })
  const { addToast } = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const { sendTransactionAsync } = useSendTransaction()
  const queryClient = useQueryClient()

  const requestEth = async () => {
    if (!address) return
    setBusy('eth')
    try {
      const currentHex: string = await rpcCall('eth_getBalance', [address, 'latest'])
      const current = BigInt(currentHex)
      const added = 10n * 10n ** 18n
      await rpcCall('anvil_setBalance', [address, '0x' + (current + added).toString(16)])
      await refetchBalance()
      addToast('10 ETH berhasil ditambahkan!', 'success')
    } catch (e: any) {
      addToast('Gagal: ' + e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const unlockAccount = async () => {
    if (!address) return
    setBusy('unlock')
    try {
      await rpcCall('anvil_impersonateAccount', [DEPLOYER_ADDR])
      await rpcCall('eth_sendTransaction', [{
        from: DEPLOYER_ADDR,
        to: address,
        value: '0x0',
        gas: '0x5208',
      }])
      await rpcCall('anvil_stopImpersonatingAccount', [DEPLOYER_ADDR])
      await refetchBalance()
      addToast('Akun siap digunakan!', 'success')
    } catch (e: any) {
      await rpcCall('anvil_stopImpersonatingAccount', [DEPLOYER_ADDR]).catch(() => {})
      addToast('Gagal: ' + e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const requestUsdc = async () => {
    if (!address) return
    setBusy('idrx')
    try {
      await rpcCall('anvil_impersonateAccount', [address])
      await rpcCall('eth_sendTransaction', [{
        from: address,
        to: CONTRACTS.MOCK_IDRX,
        data: encodeMint(address, 1000000000n),
        gas: '0x100000',
      }])
      await rpcCall('anvil_stopImpersonatingAccount', [address])
      addToast('1,000 IDRX berhasil dicetak!', 'success')
    } catch (e: any) {
      await rpcCall('anvil_stopImpersonatingAccount', [address]).catch(() => {})
      addToast('Gagal: ' + e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const fixNonce = async () => {
    if (!address) return
    setBusy('nonce')
    try {
      const nonceHex: string = await rpcCall('eth_getTransactionCount', [address, 'pending'])
      const nonce = parseInt(nonceHex, 16)
      const deployedHex: string = await rpcCall('eth_getTransactionCount', [address, 'latest'])
      const deployed = parseInt(deployedHex, 16)
      if (nonce === deployed) {
        addToast('Nonce sudah sinkron.', 'success')
        setBusy(null)
        return
      }
      const stuckCount = nonce - deployed
      for (let i = 0; i < stuckCount; i++) {
        await sendTransactionAsync({
          to: address as `0x${string}`,
          value: parseEther('0'),
        })
      }
      addToast(`Nonce diperbaiki! ${stuckCount} TX kotor dibersihkan.`, 'success')
    } catch (e: any) {
      addToast('Gagal fix nonce: ' + (e?.shortMessage || e?.message || 'Unknown error'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const resetAll = async () => {
    setBusy('reset')
    try {
      await rpcCall('anvil_reset', [])
      const res = await fetch(`${DEPLOYER}/redeploy`, { method: 'POST', signal: AbortSignal.timeout(60_000) })
      if (!res.ok) throw new Error(await res.text())
      addToast('Anvil direset! Memuat ulang...', 'success')
      await new Promise(r => setTimeout(r, 1500))
      window.location.reload()
    } catch (e: any) {
      addToast('Gagal reset: ' + (e?.message || 'Unknown error'), 'error')
      setBusy(null)
    }
  }

  const fastForward = async (seconds: number, label: string) => {
    setBusy('fastForward')
    try {
      await rpcCall('evm_increaseTime', [seconds])
      await rpcCall('evm_mine', [])
      queryClient.invalidateQueries({ queryKey: ['readContract'] })
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('chainTimeAdvanced'))
      addToast(`Waktu maju ${label}!`, 'success')
    } catch (e: any) {
      addToast('Gagal: ' + e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const grantRole = async (roleKey: string) => {
    if (!address) return
    setBusy(`role-${roleKey}`)
    try {
      const roleHash = keccak256(toHex(roleKey))
      const contractKey = CONTRACTS_TO_GRANT[roleKey]
      const grantData = '0x' +
        '2f2ff15d' + // grantRole selector
        roleHash.slice(2).padStart(64, '0') +
        address.toLowerCase().replace('0x', '').padStart(64, '0')

      await rpcCall('anvil_impersonateAccount', [DEPLOYER_ADDR])
      await rpcCall('eth_sendTransaction', [{
        from: DEPLOYER_ADDR,
        to: (CONTRACTS as any)[contractKey],
        data: grantData,
        gas: '0x200000',
      }])
      await rpcCall('anvil_stopImpersonatingAccount', [DEPLOYER_ADDR])
      addToast(`Role ${ROLES.find(r => r.key === roleKey)?.label} diberikan!`, 'success')
    } catch (e: any) {
      await rpcCall('anvil_stopImpersonatingAccount', [DEPLOYER_ADDR]).catch(() => {})
      addToast('Gagal: ' + e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  if (chainId !== anvil.id) return null

  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p className="text-sm font-medium text-blue-400">Dev Faucet</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={unlockAccount} disabled={!!busy} className="text-green-400 border-green-400/30">
            {busy === 'unlock' ? '...' : '🔓 Unlock Akun'}
          </Button>
          <Button variant="outline" size="sm" onClick={requestEth} disabled={!!busy}>
            {busy === 'eth' ? 'Mengirim...' : '10 ETH'}
          </Button>
          <Button variant="outline" size="sm" onClick={requestUsdc} disabled={!!busy}>
            {busy === 'idrx' ? 'Mencetak...' : '1,000 IDRX'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fastForward(604800, '7 hari')} disabled={!!busy} className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10">
            {busy === 'fastForward' ? '...' : '⏩ 7 Hari (Voting)'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fastForward(86400, '1 hari')} disabled={!!busy} className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10">
            {busy === 'fastForward' ? '...' : '⏩ 1 Hari (Timelock)'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
          <Button variant="destructive" size="sm" onClick={fixNonce} disabled={!!busy}>
            {busy === 'nonce' ? 'Mengirim...' : 'Fix Nonce'}
          </Button>
          <Button variant="destructive" size="sm" onClick={resetAll} disabled={!!busy}>
            {busy === 'reset' ? 'Mereset...' : 'Reset Anvil'}
          </Button>
        </div>
        <div className="pt-1 border-t border-border space-y-2">
          <p className="text-[10px] text-muted-foreground">Grant role ke wallet saat ini</p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map(r => (
              <Button
                key={r.key}
                variant="outline"
                size="sm"
                onClick={() => grantRole(r.key)}
                disabled={!!busy}
                className="text-xs"
                title={r.desc}
              >
                {busy === `role-${r.key}` ? '...' : r.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
