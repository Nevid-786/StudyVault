import { useEffect, useRef, useState } from 'react'

const LegacyPptViewer = ({ file, fileName, initialPage = 1, onProgressChange }) => {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const lastWheelTimeRef = useRef(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [renderResult, setRenderResult] = useState(null)
  const isCurrentResult = renderResult?.file === file
  const pageCount = isCurrentResult ? renderResult.pageCount : 0
  const loading = !isCurrentResult
  const error = isCurrentResult ? renderResult.error : null

  useEffect(() => {
    if (pageCount) onProgressChange?.({ pageNumber, pageCount })
  }, [onProgressChange, pageCount, pageNumber])

  useEffect(() => {
    let active = true
    let viewer

    const renderPresentation = async () => {
      try {
        const { createSlideViewer } = await import('@file-viewer/ppt')
        if (!active) return

        viewer = createSlideViewer(containerRef.current, {
          worker: true,
          onSlideChange: (index) => {
            if (active) setPageNumber(index + 1)
          },
        })
        viewerRef.current = viewer
        const presentation = await viewer.load(file)

        if (active) {
          const targetSlide = Math.min(
            Math.max(0, initialPage - 1),
            presentation.slides.length - 1,
          )
          while (viewer.slideIndex < targetSlide) viewer.next()
          setPageNumber(viewer.slideIndex + 1)
          setRenderResult({
            file,
            pageCount: presentation.slides.length,
            error: null,
          })
        }
      } catch (renderError) {
        if (active) {
          setRenderResult({
            file,
            pageCount: 0,
            error: renderError instanceof Error
              ? renderError.message
              : 'Unable to render this legacy PPT file.',
          })
        }
      }
    }

    renderPresentation()
    return () => {
      active = false
      viewerRef.current?.destroy()
      viewerRef.current = null
    }
  }, [file, initialPage])

  const handleWheel = (event) => {
    if (!pageCount || Math.abs(event.deltaY) < 20) return

    const nextPage = pageNumber + (event.deltaY > 0 ? 1 : -1)
    if (nextPage < 1 || nextPage > pageCount) return

    event.preventDefault()
    const now = Date.now()
    if (now - lastWheelTimeRef.current < 450) return
    lastWheelTimeRef.current = now

    if (event.deltaY > 0) viewerRef.current?.next()
    else viewerRef.current?.previous()
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#303030] text-white">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-black/30 bg-[#242424] px-4 shadow-md">
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-200">Legacy PowerPoint Viewer</div>
          <div className="truncate text-xs text-gray-400">{fileName}</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => viewerRef.current?.previous()}
            disabled={!pageCount || pageNumber <= 1}
            aria-label="Previous slide"
            className="rounded px-2 py-1.5 hover:bg-white/10 disabled:opacity-40"
          >
            ‹
          </button>
          <span className="whitespace-nowrap">{pageCount ? `${pageNumber} of ${pageCount}` : '-- of --'}</span>
          <button
            type="button"
            onClick={() => viewerRef.current?.next()}
            disabled={!pageCount || pageNumber >= pageCount}
            aria-label="Next slide"
            className="rounded px-2 py-1.5 hover:bg-white/10 disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-auto p-4" onWheel={handleWheel}>
        <div ref={containerRef} className="h-full min-h-60 w-full" />
        {loading && <p className="absolute inset-0 flex items-center justify-center bg-[#303030]/80 text-gray-200">Rendering presentation…</p>}
        {error && <p role="alert" className="absolute inset-0 flex items-center justify-center bg-[#303030]/90 px-6 text-center text-red-300">{error}</p>}
      </main>
    </div>
  )
}

export default LegacyPptViewer
