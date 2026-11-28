import { useEffect, useRef, useState } from 'react'
import { renderAsync } from 'docx-preview'
import './DocxViewer.css'

const DocxViewer = ({ file, fileName, fileType }) => {
  const containerRef = useRef(null)
  const styleContainerRef = useRef(null)
  const pageElements = useRef([])
  const [renderResult, setRenderResult] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(1)
  const isCurrentResult = renderResult?.file === file
  const pageCount = isCurrentResult ? renderResult.pageCount : 0
  const loading = !isCurrentResult
  const error = isCurrentResult ? renderResult.error : null

  useEffect(() => {
    let active = true
    const container = containerRef.current
    const styleContainer = styleContainerRef.current
    pageElements.current = []

    const renderDocument = async () => {
      try {
        const isDocx = fileName?.toLowerCase().endsWith('.docx')
          || fileType?.toLowerCase() === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        if (!isDocx) {
          throw new Error('Only DOCX files can be previewed. Convert legacy DOC files to DOCX first.')
        }

        await renderAsync(file, container, styleContainer, {
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          renderAltChunks: false,
          useBase64URL: true,
        })

        const pages = Array.from(container.querySelectorAll('section.docx'))
        if (pages.length === 0) throw new Error('No document pages could be rendered.')
        pageElements.current = pages
        if (active) {
          setPageNumber(1)
          setRenderResult({ file, pageCount: pages.length, error: null })
        }
      } catch (renderError) {
        container.replaceChildren()
        if (active) {
          setRenderResult({
            file,
            pageCount: 0,
            error: renderError instanceof Error
              ? renderError.message
              : 'Unable to render this DOCX file.',
          })
        }
      }
    }

    renderDocument()
    return () => {
      active = false
      container.replaceChildren()
      styleContainer.replaceChildren()
      pageElements.current = []
    }
  }, [file, fileName, fileType])

  const changeZoom = (amount) => {
    setScale((current) => Math.min(1.6, Math.max(0.7, Number((current + amount).toFixed(2)))))
  }

  const scrollToPage = (targetPage) => {
    pageElements.current[targetPage - 1]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
    setPageNumber(targetPage)
  }

  const updatePageNumberFromScroll = (event) => {
    const container = event.currentTarget
    const center = container.getBoundingClientRect().top + container.clientHeight / 2
    let closestPage = 1
    let closestDistance = Infinity

    pageElements.current.forEach((page, index) => {
      const bounds = page.getBoundingClientRect()
      const distance = Math.abs(center - (bounds.top + bounds.height / 2))
      if (distance < closestDistance) {
        closestPage = index + 1
        closestDistance = distance
      }
    })

    setPageNumber((currentPage) => currentPage === closestPage ? currentPage : closestPage)
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#303030] text-white">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-black/30 bg-[#242424] px-4 shadow-md">
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-200">DOCX Viewer</div>
          <div className="truncate text-xs text-gray-400">{fileName}</div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <button type="button" onClick={() => scrollToPage(Math.max(1, pageNumber - 1))} disabled={!pageCount || pageNumber <= 1} aria-label="Previous page" className="rounded px-2 py-1.5 hover:bg-white/10 disabled:opacity-40">‹</button>
          <span className="whitespace-nowrap px-1">
            {pageCount ? `${pageNumber} of ${pageCount}` : '-- of --'}
          </span>
          <button type="button" onClick={() => scrollToPage(Math.min(pageCount, pageNumber + 1))} disabled={!pageCount || pageNumber >= pageCount} aria-label="Next page" className="rounded px-2 py-1.5 hover:bg-white/10 disabled:opacity-40">›</button>
          <button type="button" onClick={() => setRotation((current) => (current + 270) % 360)} aria-label="Rotate counterclockwise" className="rounded px-2.5 py-1.5 hover:bg-white/10">↶</button>
          <button type="button" onClick={() => setRotation((current) => (current + 90) % 360)} aria-label="Rotate clockwise" className="rounded px-2.5 py-1.5 hover:bg-white/10">↷</button>
          <button type="button" onClick={() => changeZoom(-0.1)} disabled={scale <= 0.7} aria-label="Zoom out" className="rounded px-2.5 py-1.5 hover:bg-white/10 disabled:opacity-40">−</button>
          <span className="min-w-12 text-center">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => changeZoom(0.1)} disabled={scale >= 1.6} aria-label="Zoom in" className="rounded px-2.5 py-1.5 hover:bg-white/10 disabled:opacity-40">+</button>
        </div>
      </header>

      <main
        onScroll={updatePageNumberFromScroll}
        className="docx-viewer-scroll relative flex-1 overflow-auto px-4 py-6"
      >
        <div
          ref={containerRef}
          className="docx-viewer-pages mx-auto"
          style={{ '--docx-scale': scale, '--docx-rotation': `${rotation}deg` }}
        />
        {loading && <p className="absolute inset-0 flex justify-center bg-[#303030]/80 pt-6 text-gray-300">Rendering document…</p>}
        {error && <p role="alert" className="absolute inset-0 flex justify-center bg-[#303030]/90 pt-6 text-red-300">{error}</p>}
        <div ref={styleContainerRef} className="hidden" aria-hidden="true" />
      </main>
    </div>
  )
}

export default DocxViewer
