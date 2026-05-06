import { useState } from 'react'
import { useAccount, useBalance, useWalletClient, useSendTransaction } from 'wagmi'
import { parseEther } from 'viem'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from './Toast'
import { anvil } from '../wagmi'
import { CONTRACTS } from '../config/contracts'

const RPC = typeof import.meta.env.VITE_RPC_URL === 'string'
  ? import.meta.env.VITE_RPC_URL
  : 'http://127.0.0.1:8545'

const DEPLOYER = typeof import.meta.env.VITE_DEPLOYER_URL === 'string'
  ? import.meta.env.VITE_DEPLOYER_URL
  : 'http://localhost:3030'

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

export function DevFaucet() {
  const { address, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { refetch: refetchBalance } = useBalance({ address })
  const { addToast } = useToast()
  const [busy, setBusy] = useState<'eth' | 'usdc' | 'nonce' | 'reset' | null>(null)
  const { sendTransactionAsync } = useSendTransaction()

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

  const requestUsdc = async () => {
    if (!address) return
    setBusy('usdc')
    try {
      await rpcCall('anvil_impersonateAccount', [address])
      await rpcCall('eth_sendTransaction', [{
        from: address,
        to: CONTRACTS.MOCK_USDC,
        data: encodeMint(address, 1000000000n),
        gas: '0x100000',
      }])
      await rpcCall('anvil_stopImpersonatingAccount', [address])
      addToast('1,000 USDC berhasil dicetak!', 'success')
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
        addToast('Nonce sudah sinkron, tidak perlu fix.', 'success')
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
      addToast('Resetting Anvil...', 'info')
      await rpcCall('anvil_reset', [])
      addToast('Redeploying contracts...', 'info')
      const res = await fetch(`${DEPLOYER}/redeploy`, { method: 'POST', signal: AbortSignal.timeout(60_000) })
      if (!res.ok) throw new Error(await res.text())
      addToast('Anvil direset dan kontrak dideploy ulang!', 'success')
    } catch (e: any) {
      addToast('Gagal reset: ' + (e?.message || 'Unknown error'), 'error')
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
        <p className="text-xs text-muted-foreground">Ambil ETH dan USDC untuk testing (tanpa konfirmasi dompet)</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={requestEth} disabled={!!busy}>
            {busy === 'eth' ? 'Mengirim...' : '10 ETH'}
          </Button>
          <Button variant="outline" size="sm" onClick={requestUsdc} disabled={!!busy}>
            {busy === 'usdc' ? 'Mencetak...' : '1,000 USDC'}
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
      </CardContent>
    </Card>
  )
}
