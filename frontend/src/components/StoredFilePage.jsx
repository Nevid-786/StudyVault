import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import localDB from '../config/indexdb'

const StoredFilePage = ({ title, Viewer }) => {
  const { lid } = useParams()
  const navigate = useNavigate()
  const [loadResult, setLoadResult] = useState(null)
  const [historyError, setHistoryError] = useState(null)
  const currentHistoryError = historyError?.lid === lid ? historyError.message : ''
  const isCurrentResult = loadResult?.lid === lid
  const record = isCurrentResult ? loadResult.record : null
  const progress = isCurrentResult ? loadResult.progress : null
  const loading = !isCurrentResult
  const error = isCurrentResult ? loadResult.error : null

  const persistProgress = useCallback((updates) => {
    localDB.saveReadingProgress(lid, updates).catch((saveError) => {
      console.error('Unable to save reading progress:', saveError)
      setHistoryError({ lid, message: 'Reading progress could not be saved.' })
    })
  }, [lid])

  useEffect(() => {
    let active = true

    const loadFile = async () => {
      try {
        const storedFile = await localDB.getFileByLid(lid)
        if (!storedFile) throw new Error('This file could not be found in local storage.')
        if (!(storedFile.file instanceof Blob)) {
          throw new TypeError('This file has no readable data in local storage.')
        }
        let savedProgress = null
        try {
          savedProgress = await localDB.getReadingProgress(lid)
          if (active) setHistoryError({ lid, message: '' })
        } catch (progressError) {
          console.error('Unable to load reading progress:', progressError)
          if (active) setHistoryError({ lid, message: 'Reading progress could not be loaded.' })
        }

        if (active) {
          setLoadResult({ lid, record: storedFile, progress: savedProgress, error: null })
          // Keep the last-opened timestamp separate from page updates so reading activity does not reorder the dashboard.
          persistProgress({
            name: storedFile.name,
            type: storedFile.type,
            route: window.location.pathname,
            lastOpenedAt: Date.now(),
          })
        }
      } catch (loadError) {
        if (active) {
          setLoadResult({
            lid,
            record: null,
            progress: null,
            error: loadError instanceof Error ? loadError.message : 'Unable to load this file.',
          })
        }
      }
    }

    loadFile()
    return () => { active = false }
  }, [lid, persistProgress])

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#303030] text-gray-200">Loading {title}…</div>
  }

  if (error) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-3 bg-[#303030] px-6 text-center text-white">
        <h1 className="text-xl font-semibold">Unable to open {title}</h1>
        <p className="text-gray-300">{error}</p>
        <button type="button" onClick={() => navigate(-1)} className="rounded bg-white/10 px-4 py-2 hover:bg-white/20">
          Go back
        </button>
      </main>
    )
  }

  return (
    <div className="relative">
      <Viewer
        key={lid}
        file={record.file}
        fileName={record.name}
        fileType={record.type}
        initialPage={Math.max(1, Number(progress?.pageNumber) || 1)}
        onProgressChange={persistProgress}
      />
      {currentHistoryError && (
        <p role="status" className="absolute bottom-4 left-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 shadow">
          {currentHistoryError}
        </p>
      )}
    </div>
  )
}

export default StoredFilePage
