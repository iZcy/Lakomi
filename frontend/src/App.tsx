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
import { Compliance } from './components/Compliance'
import { WrongChainGuard } from './components/WrongChainGuard'
import { ToastProvider } from './components/Toast'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'

const queryClient = new QueryClient()

type Tab = 'dashboard' | 'simpanan' | 'pinjaman' | 'tata-kelola' | 'kepatuhan'

const NAV_ITEMS: { key: Tab; label: string; badge?: string; icon: React.ReactNode }[] = [
  {
    key: 'dashboard',
    label: 'Beranda',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    key: 'simpanan',
    label: 'Simpanan',
    badge: 'Pasal 41',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    key: 'pinjaman',
    label: 'Pinjaman',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  },
  {
    key: 'tata-kelola',
    label: 'Tata Kelola',
    badge: 'Pasal 22',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    key: 'kepatuhan',
    label: 'Kepatuhan Hukum',
    badge: 'UU 25/1992',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
]

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({ accentColor: 'hsl(217, 91%, 60%)', borderRadius: 'medium' })}
          initialChain={anvil}
        >
          <ToastProvider>
          <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-6">
              <div className="flex gap-6">
                <aside className="w-56 flex-shrink-0 hidden lg:block">
                  <div className="sticky top-24 space-y-1">
                    {NAV_ITEMS.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setActiveTab(item.key)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                          activeTab === item.key
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    ))}

                    <Separator className="my-4" />

                    <div className="px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Sesuai</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">UU 25/1992 Perkoperasian</p>
                    </div>
                  </div>
                </aside>

                <main className="flex-1 min-w-0">
                  <WrongChainGuard>
                    {activeTab === 'dashboard' && <Dashboard />}
                    {activeTab === 'simpanan' && <Vault />}
                    {activeTab === 'pinjaman' && <Loans />}
                    {activeTab === 'tata-kelola' && <Governance />}
                    {activeTab === 'kepatuhan' && <Compliance />}
                  </WrongChainGuard>
                </main>
              </div>
            </div>
          </div>
          </ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
