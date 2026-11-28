import { useEffect, useRef, useState } from 'react'
import { PPTXViewer as PptxRenderer } from 'pptx-viewer'
import LegacyPptViewer from './LegacyPptViewer'

const PptxFormatViewer = ({ file, fileName, fileType }) => {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const lastWheelTimeRef = useRef(0)
  const [renderResult, setRenderResult] = useState(null)
  const isCurrentResult = renderResult?.file === file
  const loading = !isCurrentResult
  const error = isCurrentResult ? renderResult.error : null

  useEffect(() => {
    let active = true
    let viewer
    let viewerError = null

    const renderPresentation = async () => {
      try {
        const isPptx = fileName?.toLowerCase().endsWith('.pptx')
          || fileType?.toLowerCase() === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        if (!isPptx) {
          throw new Error('Only PPTX files can be previewed. Convert legacy PPT files to PPTX first.')
        }
        viewer = new PptxRenderer(containerRef.current, {
          showControls: true,
          keyboardNavigation: true,
          onError: (renderError) => {
            viewerError = renderError
            if (active) setRenderResult({ file, error: renderError.message })
          },
        })
        viewerRef.current = viewer
        await viewer.load(await file.arrayBuffer())
        if (active) setRenderResult({ file, error: viewerError?.message || null })
      } catch (renderError) {
        if (active) {
          setRenderResult({
            file,
            error: renderError instanceof Error
              ? renderError.message
              : 'Unable to render this PPTX file.',
          })
        }
      }
    }

    renderPresentation()
    return () => {
      active = false
      viewer?.destroy()
      viewerRef.current = null
    }
  }, [file, fileName, fileType])

  const handleWheel = (event) => {
    const viewer = viewerRef.current
    if (!viewer || Math.abs(event.deltaY) < 20) return

    const currentSlide = viewer.getCurrentSlide()
    const nextSlide = currentSlide + (event.deltaY > 0 ? 1 : -1)
    if (nextSlide < 0 || nextSlide >= viewer.getSlideCount()) return

    event.preventDefault()
    const now = Date.now()
    if (now - lastWheelTimeRef.current < 450) return
    lastWheelTimeRef.current = now

    if (event.deltaY > 0) viewer.next()
    else viewer.previous()
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#303030] text-white">
      <header className="flex min-h-14 items-center border-b border-black/30 bg-[#242424] px-4 shadow-md">
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-200">PPTX Viewer</div>
          <div className="truncate text-xs text-gray-400">{fileName}</div>
        </div>
      </header>
      <main className="relative min-h-0 flex-1 overflow-auto p-4" onWheel={handleWheel}>
        <div ref={containerRef} className="min-h-full w-full" />
        {loading && <p className="absolute inset-0 flex items-center justify-center bg-[#303030]/80 text-gray-200">Rendering presentation…</p>}
        {error && <p role="alert" className="absolute inset-0 flex items-center justify-center bg-[#303030]/90 px-6 text-center text-red-300">{error}</p>}
      </main>
    </div>
  )
}

const PptxViewer = ({ file, fileName, fileType }) => {
  const extension = fileName?.split('.').pop()?.toLowerCase()
  const isLegacyPpt = extension === 'ppt'
    || (extension !== 'pptx' && fileType?.toLowerCase() === 'application/vnd.ms-powerpoint')

  return isLegacyPpt
    ? <LegacyPptViewer file={file} fileName={fileName} />
    : <PptxFormatViewer file={file} fileName={fileName} fileType={fileType} />
}

export default PptxViewer
