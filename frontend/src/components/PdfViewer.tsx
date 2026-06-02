import { useEffect, useRef, useState } from 'react'
import '../lib/pdf-setup'
import { getDocument } from 'pdfjs-dist'

export function PdfViewer({ src, page }: { src: string; page: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const rendered = useRef(new Set<number>())
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    setLoading(true)
    setError('')
    rendered.current.clear()
    pageRefs.current = []

    ;(async () => {
      try {
        const pdf = await getDocument({ url: src }).promise
        if (!mounted.current) return
        setNumPages(pdf.numPages)
        setLoading(false)

        const renderPage = async (n: number) => {
          if (rendered.current.has(n) || !mounted.current) return
          rendered.current.add(n)
          const p = await pdf.getPage(n).catch(() => null)
          if (!p) return
          const vp = p.getViewport({ scale: 1.0 })
          const c = document.createElement('canvas')
          c.style.width = '100%'
          c.width = vp.width
          c.height = vp.height
          await p.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise
          const el = pageRefs.current[n - 1]
          if (el && mounted.current) { el.innerHTML = ''; el.appendChild(c) }
        }

        const first = Array.from({ length: Math.min(3, pdf.numPages) }, (_, i) => i + 1)
        await Promise.all(first.map(renderPage))
        for (let i = 4; i <= pdf.numPages && mounted.current; i++) renderPage(i)
      } catch (e: any) {
        if (mounted.current) { setError(e.message || 'Gagal'); setLoading(false) }
      }
    })()

    return () => { mounted.current = false }
  }, [src])

  useEffect(() => {
    if (page > 0 && page <= numPages && containerRef.current) {
      const el = pageRefs.current[page - 1]
      if (el) containerRef.current.scrollTo({ top: el.offsetTop, behavior: 'smooth' })
    }
  }, [page, numPages])

  if (error) return <div className="flex items-center justify-center h-full text-xs text-red-400 p-4">{error}</div>
  if (loading) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Memuat PDF...</div>

  return (
    <div ref={containerRef} className="overflow-y-auto h-full">
      {Array.from({ length: numPages }, (_, i) => (
        <div key={i} ref={e => { pageRefs.current[i] = e }} style={{ minHeight: 200 }} />
      ))}
    </div>
  )
}
