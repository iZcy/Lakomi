import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Coins } from 'lucide-react'

export function Navbar() {
  return (
    <nav className="glass-card border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 blur-xl bg-sky-500/50 rounded-full" />
              <div className="relative p-3 bg-gradient-to-br from-sky-500 to-purple-500 rounded-xl">
                <Coins className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Lakomi</h1>
              <p className="text-xs text-gray-400">Cooperative Protocol</p>
            </div>
          </div>

          {/* Wallet Connect */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm text-gray-400">Network</p>
              <p className="text-sm font-semibold text-sky-400">Anvil Local</p>
            </div>
            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
