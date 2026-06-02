import { useEffect, useRef, useState } from 'react'

let pdfjsLib: any = null

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib
  pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  return pdfjsLib
}

export function PdfViewer({ src, page, onPageChange }: { src: string; page: number; onPageChange?: (p: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const renderedPages = useRef(new Set<number>())
  const pdfRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    renderedPages.current.clear()
    pageRefs.current = []

    const init = async () => {
      try {
        const lib = await loadPdfJs()
        if (cancelled) return
        const pdf = await lib.getDocument({ url: src }).promise
        if (cancelled) return
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        setLoading(false)

        const render = async (pageNum: number) => {
          if (renderedPages.current.has(pageNum) || cancelled) return
          renderedPages.current.add(pageNum)
          try {
            const pdfPage = await pdf.getPage(pageNum)
            const vp = pdfPage.getViewport({ scale: 1.0 })
            const canvas = document.createElement('canvas')
            canvas.style.width = '100%'
            canvas.style.height = 'auto'
            canvas.width = vp.width
            canvas.height = vp.height
            const ctx = canvas.getContext('2d')!
            await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise
            const el = pageRefs.current[pageNum - 1]
            if (el && !cancelled) { el.innerHTML = ''; el.appendChild(canvas) }
          } catch {}
        }

        const batch = Array.from({ length: Math.min(3, pdf.numPages) }, (_, i) => i + 1)
        await Promise.all(batch.map(render))
        for (let i = 4; i <= pdf.numPages && !cancelled; i++) render(i)
      } catch (e: any) {
        if (!cancelled) { setError(e?.message || 'Gagal muat PDF'); setLoading(false) }
      }
    }
    init()
    return () => { cancelled = true }
  }, [src])

  useEffect(() => {
    if (page > 0 && page <= numPages) {
      const el = pageRefs.current[page - 1]
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [page, numPages])

  useEffect(() => {
    if (!containerRef.current || !onPageChange) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = pageRefs.current.indexOf(e.target as HTMLDivElement)
            if (idx >= 0) onPageChange(idx + 1)
          }
        }
      },
      { threshold: 0.5 }
    )
    pageRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [numPages, onPageChange])

  if (error) return <div className="flex items-center justify-center h-full text-xs text-red-400 p-4">{error}</div>
  if (loading) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Memuat PDF...</div>

  return (
    <div ref={containerRef} className="overflow-y-auto h-full">
      {Array.from({ length: numPages }, (_, i) => (
        <div key={i} ref={el => { pageRefs.current[i] = el }} className="flex justify-center border-b border-border" style={{ minHeight: 200 }} />
      ))}
    </div>
  )
}
