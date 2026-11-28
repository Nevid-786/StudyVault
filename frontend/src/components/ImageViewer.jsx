import { useEffect, useState } from 'react'

const ImageViewer = ({ file, fileName }) => {
  const [imageUrl, setImageUrl] = useState(null)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [imageError, setImageError] = useState(null)
  const error = imageError?.file === file ? imageError.message : null

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const changeZoom = (amount) => {
    setScale((current) => Math.min(3, Math.max(0.25, Number((current + amount).toFixed(2)))))
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#303030] text-white">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-black/30 bg-[#242424] px-4 shadow-md">
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-200">Image Viewer</div>
          <div className="truncate text-xs text-gray-400">{fileName}</div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <button type="button" onClick={() => changeZoom(-0.25)} disabled={scale <= 0.25} aria-label="Zoom out" className="rounded px-2.5 py-1.5 hover:bg-white/10 disabled:opacity-40">−</button>
          <span className="min-w-12 text-center">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => changeZoom(0.25)} disabled={scale >= 3} aria-label="Zoom in" className="rounded px-2.5 py-1.5 hover:bg-white/10 disabled:opacity-40">+</button>
          <button type="button" onClick={() => setRotation((current) => (current + 270) % 360)} aria-label="Rotate image counterclockwise" className="rounded px-2.5 py-1.5 hover:bg-white/10">↶</button>
          <button type="button" onClick={() => setRotation((current) => (current + 90) % 360)} aria-label="Rotate image clockwise" className="rounded px-2.5 py-1.5 hover:bg-white/10">↷</button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {error ? (
          <p role="alert" className="text-center text-red-300">{error}</p>
        ) : imageUrl && (
          <div className="flex min-h-full min-w-full items-center justify-center">
            <img
              src={imageUrl}
              alt={fileName}
              onError={() => setImageError({
                file,
                message: 'This image could not be displayed by the browser.',
              })}
              className="max-h-full max-w-full object-contain"
              style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default ImageViewer
