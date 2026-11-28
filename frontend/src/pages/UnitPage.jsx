
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import SideBar from '../components/SideBar'
import TopBar from '../components/TopBar'
import localDB from '../config/indexdb'
import GoogleDriveService from '../services/googleDrive'
import { motion } from 'motion/react'

const formatFileSize = (size) => {
  size = Number(size)
  if (!Number.isFinite(size) || size <= 0) return 'Unknown size'

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const getFileIcon = (type) => {
  if (type?.startsWith('image/')) return '🖼️'
  if (type === 'application/pdf') return '📕'
  if (type?.includes('presentation')) return '📊'
  if (type?.includes('word')) return '📝'
  return '📄'
}

const getViewerPath = (file) => {
  const type = (file.type || '').toLowerCase()
  const extension = file.name?.split('.').pop()?.toLowerCase()
  const lid = encodeURIComponent(file.lid)

  if (type === 'application/pdf' || extension === 'pdf') return `/pdf/${lid}`
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
    return `/image/${lid}`
  }
  if (type.includes('wordprocessingml') || ['docx', 'doc'].includes(extension)) return `/docx/${lid}`
  if (type.includes('presentationml') || ['pptx', 'ppt'].includes(extension)) return `/pptx/${lid}`
  return null
}

const UnitPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const semester = searchParams.get('semester')
  const subject = searchParams.get('subject')
  const unit = searchParams.get('unit')

  const user = useSelector((state) => state.auth.user)
  const accessToken = useSelector((state) => state.auth.googleAccessToken)

  const [files, setFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingLid, setDeletingLid] = useState(null)
  const [deleteMessage, setDeleteMessage] = useState('')
  const [deleteError, setDeleteError] = useState('')

  // Load files from IndexedDB
  const loadFiles = async () => {
    let isCurrent = true
    setError(null)
     localDB
      .getallfileInAUnit(semester, subject, unit)
      .then((result) => {
        if (isCurrent) {
          setFiles(result)
        }
      })
      .catch((loadError) => {
        console.error('Unable to load unit files:', loadError)

        if (isCurrent) {
          setError(loadError.message || 'Unable to load files')
        }
      })
      .finally(() => {
        if (isCurrent) {
          setLoading(false)
        }
      })
  }

  useEffect(() => {
   



    loadFiles()
   
  }, [semester, subject, unit])

  // Create preview URLs when files change.
  // Revoke them when the files change or this component unmounts.
  useEffect(() => {
    const urls = {}

    files.forEach((file) => {
      if (file.file instanceof Blob) {
        urls[file.id] = URL.createObjectURL(file.file)
      }
    })

    setPreviewUrls(urls)

    return () => {
      Object.values(urls).forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [files])

  const filteredFiles = files.filter((file) =>
    (file.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const unitParams = new URLSearchParams({
    semester: semester || '',
    subject: subject || '',
    unit: unit || '',
  })

  // Open the original file in a new tab
  const openFile = (file) => {
    const url = previewUrls[file.id]

    if (!url) {
      console.error('File data is unavailable')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDeleteFile = async (file) => {
    const canIdentifyDriveCopy = Boolean(file.lid || file.driveFileId)
    const confirmation = accessToken && canIdentifyDriveCopy
      ? `Delete "${file.name}" from this device and any matching Google Drive copies?`
      : `Delete "${file.name}" from this device?${accessToken ? ' This file has no Drive identifier, so any cloud copy cannot be identified.' : ' Any Google Drive copy will remain.'}`
    if (!window.confirm(confirmation)) return

    setDeletingLid(file.lid)
    setDeleteMessage('')
    setDeleteError('')
    try {
      const driveCopiesDeleted = accessToken && canIdentifyDriveCopy
        ? await GoogleDriveService.deleteFileByLid(accessToken, file.lid, file.driveFileId)
        : 0
      const localDeleted = await localDB.deleteFile(file.lid, file.id)
      if (!localDeleted) throw new Error('The local file was not found, so it could not be deleted.')

      setFiles((current) => current.filter((savedFile) => savedFile.lid !== file.lid))
      setDeleteMessage(accessToken && canIdentifyDriveCopy
        ? driveCopiesDeleted > 0
          ? `Deleted the local file and ${driveCopiesDeleted} Google Drive ${driveCopiesDeleted === 1 ? 'copy' : 'copies'}.`
          : 'Deleted the local file. No matching Google Drive copy was found.'
        : accessToken
          ? 'Deleted the local file. No Drive identifier was available to locate its cloud copy.'
          : 'Deleted the local file. Sign in to Google Drive if you also want to remove its cloud copy.')
    } catch (deleteError) {
      console.error('Unable to delete the selected file:', deleteError)
      setDeleteError(deleteError instanceof Error ? deleteError.message : 'Unable to delete the selected file.')
    } finally {
      setDeletingLid(null)
    }
  }

  return (
    <div className="app-shell">
      <SideBar />

      <main className="main-content">
        <TopBar islogged={Boolean(user)} user={user} />

        <div className="page-scroll">
          <div className="subjects-page-header">
            <div>
              <div className="page-breadcrumb">
                ● UNIT MATERIALS
              </div>

              <h1 className="page-greeting">
                {unit || 'Unit files'}
              </h1>

              <p className="page-subtitle">
                <span className="highlight-pill">
                  {files.length} files
                </span>

                {subject && ` • ${subject}`}
                {semester && ` • Semester ${semester}`}
              </p>
            </div>

            <button
              className="btn-primary"
              onClick={() =>
                navigate(`/add?${unitParams.toString()}`)
              }
            >
              + Add material
            </button>
          </div>

          <div className="subj-toolbar">
            <div className="subj-search">
              <input
                className="subj-search-input"
                placeholder="Search files…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {deleteMessage && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{deleteMessage}</p>}
          {deleteError && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{deleteError}</p>}

          {loading ? (
            <div className="empty-state">
              <div className="empty-title">
                Loading files…
              </div>
            </div>
          ) : error ? (
            <div className="empty-state">
              <div className="empty-icon">⚠️</div>

              <div className="empty-title">
                Unable to load files
              </div>

              <div className="empty-sub">
                {error}
              </div>
            </div>
          ) : filteredFiles.length > 0 ? (
            <div className="subjects-grid-full">
              {filteredFiles.map((file) => {
                const isPdf = file.type === 'application/pdf'
                const isImage = file.type?.startsWith('image/')
                const previewUrl = previewUrls[file.id]

                return (
                  <div className="subj-card"  key={file.id}>
                    <div className="subj-card-header">
                      <div
                        className="subj-card-icon"
                        style={{
                          background: '#eef2ff',
                          color: '#4f46e5',
                          fontSize: 22,
                        }}
                      >
                        {getFileIcon(file.type)}
                      </div>

                      <span
                        className="subj-status-pill"
                        style={{
                          background: '#eef2ff',
                          color: '#4f46e5',
                        }}
                      >
                        {file.type || 'File'}
                      </span>
                    </div>

                    {/* PDF and image previews */}
                    <div
                      className="file-preview"
                      style={{
                        height: 150,
                        overflow: 'hidden',
                        borderRadius: 8,
                        background: '#f3f4f6',
                        marginTop: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {previewUrl && isPdf ? (
                        <iframe
                          src={previewUrl}
                          title={`Preview of ${file.name}`}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            pointerEvents: 'none',
                          }}
                        />
                      ) : previewUrl && isImage ? (
                        <img
                          src={previewUrl}
                          alt={file.name}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: 48,
                          }}
                        >
                          {getFileIcon(file.type)}
                        </div>
                      )}
                    </div>

                    <div
                      className="subj-card-name"
                      title={file.name}
                    >
                      {file.name}
                    </div>

                    <div className="subj-card-code">
                      {formatFileSize(file?.size)}
                    </div>

                    {previewUrl && (
                      <div className=" flex gap-x-0.5 mt-2">
                        <motion.button
                        whileClick={{ scale: 0.95 }}
                        className="subj-delete-btn bg-red-400 text-white p-1 rounded-lg"
                        type="button"
                        disabled={deletingLid === file.lid}
                        onClick={() => handleDeleteFile(file)}
                        >
                          {deletingLid === file.lid ? 'Deleting…' : 'Delete file'}
                        </motion.button>
                        <button onClick={() => {
                          const viewerPath = getViewerPath(file)
                          if (viewerPath) window.open(viewerPath, '_blank', 'noopener,noreferrer')
                          else openFile(file)
                        }}
                          className="subj-open-btn"
                          style={{
                            background: '#eef2ff',
                            color: '#4f46e5',
                          }}

                        >
                          Open file
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📚</div>

              <div className="empty-title">
                {search
                  ? 'No matching files'
                  : 'No files in this unit yet'}
              </div>

              <div className="empty-sub">
                {search
                  ? 'Try another filename.'
                  : 'Add material to this unit to see it here.'}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default UnitPage
