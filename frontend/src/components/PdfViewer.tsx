import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export function PdfViewer({ src, page }: { src: string; page: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const renderedPages = useRef(new Set<number>())

  const renderPage = useCallback(async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    if (renderedPages.current.has(pageNum)) return
    renderedPages.current.add(pageNum)
    const pdfPage = await pdf.getPage(pageNum)
    const viewport = pdfPage.getViewport({ scale: 1.2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await pdfPage.render({ canvasContext: ctx, viewport }).promise
    const el = pageRefs.current[pageNum - 1]
    if (el) {
      el.innerHTML = ''
      el.appendChild(canvas)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    renderedPages.current.clear()
    const loadPdf = async () => {
      try {
        const pdf = await pdfjsLib.getDocument(src).promise
        setNumPages(pdf.numPages)
        setLoading(false)
        const firstBatch = Array.from({ length: Math.min(3, pdf.numPages) }, (_, i) => i + 1)
        await Promise.all(firstBatch.map(n => renderPage(pdf, n)))
        for (let i = 4; i <= pdf.numPages; i++) {
          renderPage(pdf, i)
        }
      } catch {
        setLoading(false)
      }
    }
    loadPdf()
  }, [src, renderPage])

  useEffect(() => {
    if (page > 0 && page <= numPages) {
      const el = pageRefs.current[page - 1]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [page, numPages])

  if (loading) {
    return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Memuat PDF...</div>
  }

  return (
    <div ref={containerRef} className="overflow-y-auto h-full">
      {Array.from({ length: numPages }, (_, i) => (
        <div
          key={i}
          ref={el => { pageRefs.current[i] = el }}
          className="flex justify-center border-b border-border"
        />
      ))}
    </div>
  )
}
