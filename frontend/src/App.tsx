import { useState } from 'react'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig, anvil } from './wagmi'
import { Navbar } from './components/Navbar'
import { Dashboard } from './components/Dashboard'
import { Governance } from './components/Governance'
import { Vault } from './components/Vault'
import { Loans } from './components/Loans'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'

const queryClient = new QueryClient()

type Tab = 'dashboard' | 'governance' | 'vault' | 'loans'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#0ea5e9',
            accentColorForeground: 'white',
            borderRadius: 'large',
          })}
          initialChain={anvil}
        >
          <div className="min-h-screen">
            <Navbar />

            <div className="container mx-auto px-6 py-8">
              <div className="flex gap-8">
                {/* Sidebar */}
                <aside className="w-72 flex-shrink-0">
                  <div className="glass-card p-6 sticky top-28 space-y-3">
                    <div className="mb-6">
                      <h2 className="gradient-text text-2xl font-bold mb-1">Lakomi</h2>
                      <p className="text-gray-400 text-sm">Cooperative Protocol</p>
                    </div>

                    <NavButton
                      active={activeTab === 'dashboard'}
                      onClick={() => setActiveTab('dashboard')}
                      icon="📊"
                      label="Dashboard"
                    />
                    <NavButton
                      active={activeTab === 'governance'}
                      onClick={() => setActiveTab('governance')}
                      icon="🗳️"
                      label="Governance"
                    />
                    <NavButton
                      active={activeTab === 'vault'}
                      onClick={() => setActiveTab('vault')}
                      icon="🏦"
                      label="Vault"
                    />
                    <NavButton
                      active={activeTab === 'loans'}
                      onClick={() => setActiveTab('loans')}
                      icon="💰"
                      label="Loans"
                    />

                    {/* Info Card */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <h3 className="text-sm font-semibold text-gray-300 mb-2">About Lakomi</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        A democratic cooperative where contribution builds reputation, not power.
                        Every member has equal voting rights.
                      </p>
                    </div>
                  </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1">
                  {activeTab === 'dashboard' && <Dashboard />}
                  {activeTab === 'governance' && <Governance />}
                  {activeTab === 'vault' && <Vault />}
                  {activeTab === 'loans' && <Loans />}
                </main>
              </div>
            </div>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${
        active
          ? 'active text-white font-medium'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export default App
