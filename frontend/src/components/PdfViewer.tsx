import { useEffect, useRef, useState } from 'react'

let pdfjsLib: any = null
async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib
  pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  return pdfjsLib
}

export function PdfViewer({ src, page, onPageChange, highlight }: { src: string; page: number; onPageChange?: (p: number) => void; highlight?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const renderedPages = useRef(new Set<number>())

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
        setNumPages(pdf.numPages)
        setLoading(false)

        const render = async (pageNum: number) => {
          if (renderedPages.current.has(pageNum) || cancelled) return
          renderedPages.current.add(pageNum)
          try {
            const pdfPage = await pdf.getPage(pageNum)
            const scale = 1.2
            const vp = pdfPage.getViewport({ scale })

            const wrapper = document.createElement('div')
            wrapper.style.position = 'relative'
            wrapper.style.width = '100%'

            const canvas = document.createElement('canvas')
            canvas.style.width = '100%'
            canvas.style.display = 'block'
            canvas.width = vp.width
            canvas.height = vp.height
            const ctx = canvas.getContext('2d')!
            await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise
            wrapper.appendChild(canvas)

            try {
              const textContent = await pdfPage.getTextContent()
              const textLayer = document.createElement('div')
              textLayer.style.position = 'absolute'
              textLayer.style.left = '0'
              textLayer.style.top = '0'
              textLayer.style.right = '0'
              textLayer.style.bottom = '0'
              textLayer.style.overflow = 'hidden'
              textLayer.style.pointerEvents = 'auto'
              textLayer.setAttribute('data-page', String(pageNum))

              const txtVp = pdfPage.getViewport({ scale })
              const textDivs: HTMLElement[] = []
              let lastY = -1
              for (const item of textContent.items) {
                if (!item.str?.trim()) continue
                const tx = txtVp.convertToViewportPoint(item.transform[4], item.transform[5])
                const div = document.createElement('span')
                div.textContent = item.str
                div.style.position = 'absolute'
                div.style.left = `${(tx[0] / txtVp.width) * 100}%`
                div.style.top = `${(tx[1] / txtVp.height) * 100}%`
                div.style.fontSize = `${Math.abs(item.transform[0]) * scale * 0.75}px`
                div.style.color = 'transparent'
                div.style.userSelect = 'text'
                div.style.cursor = 'text'
                textDivs.push(div)
                lastY = tx[1]
              }
              textDivs.forEach(d => textLayer.appendChild(d))
              wrapper.appendChild(textLayer)
            } catch {}

            const el = pageRefs.current[pageNum - 1]
            if (el && !cancelled) { el.innerHTML = ''; el.appendChild(wrapper) }
          } catch {}
        }

        const batch = Array.from({ length: Math.min(3, pdf.numPages) }, (_, i) => i + 1)
        await Promise.all(batch.map(render))
        for (let i = 4; i <= pdf.numPages && !cancelled; i++) render(i)
      } catch (e: any) {
        if (!cancelled) { setError(e?.message || 'Gagal'); setLoading(false) }
      }
    }
    init()
    return () => { cancelled = true }
  }, [src])

  useEffect(() => {
    if (page > 0 && page <= numPages) {
      const el = pageRefs.current[page - 1]
      if (el && containerRef.current) {
        const top = el.offsetTop
        containerRef.current.scrollTo({ top: top - 10, behavior: 'smooth' })
      }
    }
  }, [page, numPages])

  useEffect(() => {
    if (!containerRef.current || !onPageChange) return
    const c = containerRef.current
    const handle = () => {
      for (let i = pageRefs.current.length - 1; i >= 0; i--) {
        const el = pageRefs.current[i]
        if (el) {
          const rect = el.getBoundingClientRect()
          const crect = c.getBoundingClientRect()
          if (rect.top <= crect.top + 100) { onPageChange(i + 1); break }
        }
      }
    }
    c.addEventListener('scroll', handle, { passive: true })
    return () => c.removeEventListener('scroll', handle)
  }, [numPages, onPageChange])

  if (error) return <div className="flex items-center justify-center h-full text-xs text-red-400 p-4">{error}</div>
  if (loading) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Memuat PDF...</div>

  return (
    <div ref={containerRef} className="overflow-y-auto h-full">
      {Array.from({ length: numPages }, (_, i) => (
        <div 
          key={i} 
          ref={el => { pageRefs.current[i] = el }} 
          className={`flex justify-center transition-all duration-300 ${highlight === i + 1 ? 'ring-4 ring-amber-500 ring-offset-2 ring-offset-muted bg-amber-500/5' : ''}`}
          style={{ minHeight: 200 }}
        />
      ))}
    </div>
  )
}
