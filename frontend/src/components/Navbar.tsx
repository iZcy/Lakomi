import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'

const ANVIL_CHAIN = {
  chainId: '0x7a69',
  chainName: 'Anvil Lokal',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['http://127.0.0.1:8545'],
}

export function Navbar() {
  const { isConnected } = useAccount()
  const [adding, setAdding] = useState(false)

  const addChain = async () => {
    if (!window.ethereum) return
    setAdding(true)
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [ANVIL_CHAIN],
      })
    } catch (e) {
      console.error(e)
    } finally {
      setAdding(false)
    }
  }

  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">Lakomi</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Koperasi Digital Berbasis Blockchain</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isConnected && (
              <Button variant="outline" size="sm" onClick={addChain} disabled={adding}>
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {adding ? 'Menambahkan...' : 'Tambah Jaringan ke Dompet'}
              </Button>
            )}
            <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
          </div>
        </div>
      </div>
    </nav>
  )
}
