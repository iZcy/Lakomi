import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export function PdfViewer({ src, page }: { src: string; page: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const renderedPages = useRef(new Set<number>())

  useEffect(() => {
    setLoading(true)
    setError('')
    renderedPages.current.clear()
    pageRefs.current = []
    const loadPdf = async () => {
      try {
        const pdf = await pdfjsLib.getDocument({ url: src }).promise
        setNumPages(pdf.numPages)
        setLoading(false)
        const renderPage = async (pageNum: number) => {
          if (renderedPages.current.has(pageNum)) return
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
            if (el) {
              el.innerHTML = ''
              el.appendChild(canvas)
            }
          } catch {}
        }
        const first = Array.from({ length: Math.min(3, pdf.numPages) }, (_, i) => i + 1)
        await Promise.all(first.map(renderPage))
        for (let i = 4; i <= pdf.numPages; i++) renderPage(i)
      } catch (e: any) {
        setError(e?.message || 'Gagal memuat PDF')
        setLoading(false)
      }
    }
    loadPdf()
  }, [src])

  useEffect(() => {
    if (page > 0 && page <= numPages) {
      const el = pageRefs.current[page - 1]
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [page, numPages])

  if (error) return <div className="flex items-center justify-center h-full text-xs text-red-400">{error}</div>
  if (loading) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Memuat PDF...</div>

  return (
    <div ref={containerRef} className="overflow-y-auto h-full">
      {Array.from({ length: numPages }, (_, i) => (
        <div key={i} ref={el => { pageRefs.current[i] = el }} className="flex justify-center" style={{ minHeight: 200 }} />
      ))}
    </div>
  )
}
