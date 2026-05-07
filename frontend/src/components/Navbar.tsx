import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { useToast } from './Toast'

const RPC = typeof import.meta.env.VITE_RPC_URL === 'string'
  ? import.meta.env.VITE_RPC_URL
  : 'http://127.0.0.1:8545'

const ANVIL_CHAIN = {
  chainId: '0x4c831',
  chainName: 'Anvil Lokal',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: [RPC],
}

async function rpcCall(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  })
  const json = await res.json()
  return json.result
}

function getMemberName(address: string): string | null {
  try {
    const stored = JSON.parse(localStorage.getItem('lakomi_members') || '{}')
    const data = stored[address.toLowerCase()]
    return data?.namaLengkap || null
  } catch {
    return null
  }
}

export function Navbar() {
  const { address, isConnected } = useAccount()
  const [adding, setAdding] = useState(false)
  const [chainTime, setChainTime] = useState('')
  const [memberName, setMemberName] = useState<string | null>(null)
  const { addToast } = useToast()

  useEffect(() => {
    const fetchTime = async () => {
      try {
        const block = await rpcCall('eth_getBlockByNumber', ['latest', false])
        if (block?.timestamp) {
          const ts = parseInt(block.timestamp, 16) * 1000
          setChainTime(new Date(ts).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          }))
        }
      } catch {
        // block timestamp unavailable
      }
    }
    fetchTime()
    const interval = setInterval(fetchTime, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (address) {
      setMemberName(getMemberName(address))
    } else {
      setMemberName(null)
    }
  }, [address])

  const addChain = async () => {
    if (!window.ethereum) {
      addToast('Dompet tidak terdeteksi. Pastikan Brave Wallet / MetaMask terpasang.', 'error')
      return
    }
    setAdding(true)
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [ANVIL_CHAIN],
      })
      addToast('Jaringan Anvil berhasil ditambahkan!', 'success')
    } catch (e: any) {
      if (e?.code === 4001) return
      addToast('Gagal menambahkan jaringan: ' + (e?.message || e), 'error')
    } finally {
      setAdding(false)
    }
  }

  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary rounded-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold">Lakomi</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight hidden sm:block">Koperasi Digital Berbasis Blockchain</p>
            </div>
            {chainTime && (
              <span className="text-[10px] text-muted-foreground hidden sm:inline ml-2">Chain: {chainTime}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isConnected && (
              <Button variant="outline" size="sm" onClick={addChain} disabled={adding}>
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="hidden sm:inline">{adding ? 'Menambahkan...' : 'Tambah Jaringan ke Dompet'}</span>
                <span className="sm:hidden">{adding ? '...' : 'Tambah Jaringan'}</span>
              </Button>
            )}
            <div className="flex flex-col items-end">
              {memberName && (
                <span className="text-[10px] text-muted-foreground leading-tight mb-0.5">{memberName}</span>
              )}
              <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
