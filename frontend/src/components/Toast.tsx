import { useState, useEffect, createContext, useContext, useCallback } from 'react'

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' }
type ToastCtx = { addToast: (message: string, type?: Toast['type']) => void }

const ToastContext = createContext<ToastCtx>({ addToast: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let counter = 0

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + counter++
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg text-sm font-medium shadow-lg border animate-in slide-in-from-right ${
              t.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : t.type === 'error'
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            }`}
          >
            {t.type === 'success' && '✓ '}
            {t.type === 'error' && '✗ '}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
