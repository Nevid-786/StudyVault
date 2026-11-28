import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import subjectService from '../services/subjectService'

const StoredFilePage = ({ title, Viewer }) => {
  const { lid } = useParams()
  const navigate = useNavigate()
  const [loadResult, setLoadResult] = useState(null)
  const isCurrentResult = loadResult?.lid === lid
  const record = isCurrentResult ? loadResult.record : null
  const loading = !isCurrentResult
  const error = isCurrentResult ? loadResult.error : null

  useEffect(() => {
    let active = true

    const loadFile = async () => {
      try {
        const storedFile = await subjectService.getFileByLid(lid)
        if (!storedFile) throw new Error('This file could not be found in local storage.')
        if (!(storedFile.file instanceof Blob)) {
          throw new TypeError('This file has no readable data in local storage.')
        }
        if (active) setLoadResult({ lid, record: storedFile, error: null })
      } catch (loadError) {
        if (active) {
          setLoadResult({
            lid,
            record: null,
            error: loadError instanceof Error ? loadError.message : 'Unable to load this file.',
          })
        }
      }
    }

    loadFile()
    return () => { active = false }
  }, [lid])

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

  return <Viewer key={lid} file={record.file} fileName={record.name} fileType={record.type} />
}

export default StoredFilePage
