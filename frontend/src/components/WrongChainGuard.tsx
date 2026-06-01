import { useAccount, useSwitchChain } from 'wagmi'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { anvil } from '../wagmi'

export function WrongChainGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  if (isConnected && chainId !== anvil.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="p-4 bg-amber-500/10 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1">Jaringan Salah</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Dompet Anda terhubung ke Chain ID {chainId}.<br />
              Lakomi membutuhkan jaringan <strong>Anvil Lokal</strong> (Chain ID 31337).
            </p>
            <Button onClick={() => switchChain({ chainId: anvil.id })}>
              Ganti ke Anvil Lokal
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
