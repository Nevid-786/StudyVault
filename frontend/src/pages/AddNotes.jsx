import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import SideBar from '../components/SideBar'
import TopBar from '../components/TopBar'
import './AddNotes.css'
import localDB from '../config/indexdb'
import GoogleDriveService from '../services/googleDrive'
const ACCEPTED_FILES = '.pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg'

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const AddNotes = () => {
  const [searchParams] = useSearchParams()
  const subject = searchParams.get('subject');
  const semester = searchParams.get('semester');
  const unit = searchParams.get('unit');
  const navigate = useNavigate()
  const accessToken = useSelector((state) => state.auth.googleAccessToken);
  const user = useSelector((state) => state.auth.user);
  const folderId = useSelector((state) => state.auth.folderId);
  const fileInput = useRef(null)
  const cameraInput = useRef(null)
  const [files, setFiles] = useState([])
  const [destination, setDestination] = useState(localStorage.getItem("destination")||"both");
  const [isDragging, setIsDragging] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [webLink, setWebLink] = useState('')
  const [linkError, setLinkError] = useState('')
  const [fileError, setFileError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0);

  const addFiles = (newFiles) => {
    const allFiles = Array.from(newFiles)
    const validFiles = allFiles.filter((file) =>
      /\.(pdf|ppt|pptx|doc|docx|png|jpe?g)$/i.test(file.name)
    )
    setFileError(validFiles.length < allFiles.length ? 'Some files were skipped. Choose PDF, PPT, DOC, PNG, or JPG files.' : '')
    setFiles((current) => {
      const knownFiles = new Set(current.map((file) => `${file.name}-${file.size}`))
      return [...current, ...validFiles.filter((file) => !knownFiles.has(`${file.name}-${file.size}`))]
    })
  }

  const handleFileChange = (event) => {
    addFiles(event.target.files || [])
    event.target.value = ''
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
    
  }

const gdriveuploadFiles = async (fileDatas) => {
  await Promise.all(
    Array.from(fileDatas).map(async (filedata) => {
      try {
        const result = await GoogleDriveService.uploadFile(
          folderId,
          filedata.file,
          accessToken,
          semester,
          subject,
          unit,
          filedata.lid,
         
          (percent) => {
            setProgress((prev) => ({
              ...prev,
              [filedata.name]: percent,
            }))
          }
        )

        console.log('Uploaded:', result)
      } catch (error) {
        console.error(`Failed: ${file.name}`, error)
      }
    })
  )
}

  const handleuploadFiles = async () => {
    setUploadError('')
    if (files.length === 0) {
      setFileError('No files selected for upload.')
      return
    }
    if ([semester, subject, unit].some((value) => !value)) {
      setUploadError('Open Add material from a unit so the files can be saved to the correct location.')
      return
    }
    const fileDatas=files.map((file) => {
      return {
        lid: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        file: file,
        isLink: file.isLink || false,
      }
    })
    setUploading(true)
    try {
      if(destination === 'drive' || destination === 'both') {
        await gdriveuploadFiles(fileDatas)
      }
      if(destination === 'device' || destination === 'both') {
      await Promise.all(fileDatas.map((filedata) => localDB.upload(
        filedata.file,
        filedata.name,
        semester,
        subject,
        unit,
        filedata.type,
        filedata.size,
        filedata.lid
      )))
        }
      const params = new URLSearchParams({ semester, subject, unit })
     
    } catch (error) {
      console.error('Unable to upload selected files:', error)
      setUploadError(error.message || 'Unable to save the selected files.')
    } finally {
      
    }
  }
  console.log(progress);
  const addWebLink = (event) => {
    event.preventDefault()
    try {
      const url = new URL(webLink)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported URL')
      setLinkError('')
      setFiles((current) => [
        ...current,
        { name: url.hostname + url.pathname, size: 0, isLink: true },
      ])
      setWebLink('')
      setShowLinkForm(false)
    } catch {
      setLinkError('Enter a valid web address starting with http:// or https://.')
    }
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0)
  const totalSize = formatSize(totalBytes)
  const isLogged = Boolean(user)

  return (
    <div className="app-shell add-notes-shell">
      <SideBar />
      <main className="main-content">
        <TopBar islogged={isLogged} user={user} />
        <div className="add-notes-page">
          <section className="add-notes-card" aria-labelledby="add-notes-title">
            <div className="add-notes-accent" />
            <header className="add-notes-header">
              <div className="add-notes-heading">
                <span className="add-notes-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 11v7m-3.5-3.5h7" /></svg>
                </span>
                <h1 id="add-notes-title">{isReviewing ? 'Review your files' : 'Add notes'}</h1>
              </div>
              <p>{isReviewing ? 'Check your files and save destination before continuing.' : 'Import lectures, syllabi, study materials, or snapshots to your vault workspace.'}</p>
              <button className="add-notes-close" type="button" aria-label="Close" onClick={() => navigate('/')}>
                <svg viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12" /></svg>
              </button>
            </header>

            {!isReviewing ? (
              <>
                <div className="add-notes-body">
                  <div className="import-options">
                    <button className="import-option" type="button" onClick={() => fileInput.current?.click()}>
                      <span className="import-option-icon whatsapp-icon">
                        <svg viewBox="0 0 24 24"><path d="M20 11.5a8.4 8.4 0 0 1-12.4 7.4L4 20l1.1-3.5A8.4 8.4 0 1 1 20 11.5Z" /><path d="M9 8.5c.3 2.6 2.2 4.5 4.8 5l1.1-1-1.8-1-1 .7a5 5 0 0 1-2-2l.7-1-1-1.8-1 .1Z" /></svg>
                      </span>
                      <span className="import-option-copy"><strong>Import from WhatsApp <small>How?</small></strong><span>Add class group PDFs and shared notes</span></span>
                      <span className="option-arrow">→</span>
                    </button>
                    <button className="import-option" type="button" onClick={() => fileInput.current?.click()}>
                      <span className="import-option-icon upload-option-icon">
                        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8z" /><path d="M14 2v6h6m-8 8v-5m-2 2 2-2 2 2" /></svg>
                      </span>
                      <span className="import-option-copy"><strong>Upload files</strong><span>Browse files from computer or drive</span></span>
                      <svg className="option-trailing-icon" viewBox="0 0 24 24"><path d="M12 16V4m-4 4 4-4 4 4M5 14v5h14v-5" /></svg>
                    </button>
                    <button className="import-option" type="button" onClick={() => { setShowLinkForm((shown) => !shown); setLinkError('') }}>
                      <span className="import-option-icon link-option-icon">
                        <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7" /></svg>
                      </span>
                      <span className="import-option-copy"><strong>Save web link</strong><span>Paste URL from articles, Byju’s, Wikipedia</span></span>
                      <svg className="option-trailing-icon" viewBox="0 0 24 24"><path d="M14 4h6v6m0-6-9 9" /><path d="M18 13v6H5V6h6" /></svg>
                    </button>
                    <button className="import-option" type="button" onClick={() => cameraInput.current?.click()}>
                      <span className="import-option-icon scan-option-icon">
                        <svg viewBox="0 0 24 24"><path d="M4 8V4h4m8 0h4v4m0 8v4h-4m-8 0H4v-4" /><path d="M8 8h8v8H8zM10 11h4m-4 2h4" /></svg>
                      </span>
                      <span className="import-option-copy"><strong>Scan with camera <small className="ocr-tag">OCR</small></strong><span>Auto-extract text from paper handwritten…</span></span>
                      <svg className="option-trailing-icon" viewBox="0 0 24 24"><path d="M4 7h3l2-2h6l2 2h3v12H4z" /><circle cx="12" cy="13" r="3" /></svg>
                    </button>
                  </div>

                  {showLinkForm && (
                    <form className="web-link-form" onSubmit={addWebLink}>
                      <label htmlFor="web-link">Article or resource URL</label>
                      <div className="web-link-controls">
                        <input id="web-link" type="url" placeholder="https://example.com/lecture-notes" value={webLink} onChange={(event) => setWebLink(event.target.value)} />
                        <button type="submit">Add link</button>
                      </div>
                      {linkError && <span className="web-link-error" role="alert">{linkError}</span>}
                    </form>
                  )}

                  <input ref={fileInput} className="visually-hidden-input" type="file" accept={ACCEPTED_FILES} multiple onChange={handleFileChange} />
                  <input ref={cameraInput} className="visually-hidden-input" type="file" accept="image/*" capture="environment" onChange={handleFileChange} />

                  <div
                    className={`file-dropzone ${isDragging ? 'is-dragging' : ''}`}
                    onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
                    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false) }}
                    onDrop={handleDrop}
                  >
                    <div className="cloud-upload-icon">
                      <svg viewBox="0 0 24 24"><path d="M20 16.5a4.5 4.5 0 0 0-1.1-8.9A6 6 0 0 0 7.4 6 4.5 4.5 0 0 0 7 15h3" /><path d="m9 13 3-3 3 3m-3-3v10" /></svg>
                      <span />
                    </div>
                    <h2>Drop PDFs, slides, images here to import</h2>
                    <p>Drag files directly from desktop or folders. Fast multi-file batch parsing<br className="dropzone-break" /> with automated tagging.</p>
                    <div className="file-type-pills">
                      <span><b className="pdf-type">▣</b> PDF</span>
                      <span><b className="ppt-type">▣</b> PPTX</span>
                      <span><b className="doc-type">▣</b> DOCX</span>
                      <span><b className="img-type">▣</b> PNG / JPG</span>
                    </div>
                    <button className="browse-files-btn" type="button" onClick={() => fileInput.current?.click()}>
                      <svg viewBox="0 0 24 24"><path d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m12-4-4-4-4 4m4-4v12" /></svg>
                      Browse local files
                    </button>
                  </div>

                  <div className="queued-files">
                    <div className="queued-file-icons" aria-hidden="true">
                      <span className="pdf-type">▣</span><span className="img-type">▣</span><span className="ppt-type">▣</span>
                    </div>
                    <div className="queued-file-summary">
                      {files.length > 0 ? (
                        <>
                          <strong>{files.length === 1 ? files[0].name : `${files[0].name} and ${files.length - 1} others`}</strong>
                          <span>Total: {totalSize} • Selected for review</span>
                        </>
                      ) : (
                        <>
                          <strong>No files selected yet</strong>
                          <span>Choose local files or drop them above</span>
                        </>
                      )}
                    </div>
                    <span className="security-check">
                      <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>
                      Private upload • OCR ready
                    </span>
                    {files.length > 0 && (
                      <button className="clear-files-btn" type="button" onClick={() => { setFiles([]); setFileError('') }}>
                        Clear
                      </button>
                    )}
                  </div>
                  {fileError && <p className="file-selection-error" role="alert">{fileError}</p>}

                  <div className="destination-row">
                    <span className="destination-label">
                      <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z" /><path d="M9 8h6m-6 4h6m-6 4h4" /></svg>
                      Save destination:
                    </span>
                    <div className="destination-options" role="group" aria-label="Save destination">
                      <button type="button" className={destination === 'device' ? 'selected' : ''} onClick={() => setDestination('device')}>
                        <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="1" /><path d="M8 21h8m-4-4v4" /></svg>This device
                      </button>
                      <button type="button" className={destination === 'drive' ? 'selected' : ''} onClick={() => setDestination('drive')}>
                        <svg viewBox="0 0 24 24"><path d="M8.5 18h9a4 4 0 0 0 .5-8A6 6 0 0 0 6.4 8 5 5 0 0 0 8.5 18Z" /></svg>Google Drive
                      </button>
                      <button type="button" className={destination === 'both' ? 'selected' : ''} onClick={() => setDestination('both')}>
                        <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z" /><path d="m8 12 2.5 2.5L16 9" /></svg>Both
                      </button>
                    </div>
                  </div>
                </div>
                <footer className="add-notes-footer">
                  <span className="vault-encryption">
                    <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></svg>
                    Encrypted end-to-end in your private vault
                  </span>
                  <div className="add-notes-actions">
                    <button type="button" className="cancel-import-btn" onClick={() => navigate('/')}>Cancel</button>
                    <button type="button" className="continue-review-btn" disabled={files.length === 0 || uploading} onClick={(e) => {handleuploadFiles();setIsReviewing(true)}}>
                      Continue to Review <span className="pending-count">{files.length} files pending</span>
                      <svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                    </button>
                  </div>
                </footer>
              </>
            ) : (
              <>
                <div className="add-notes-review">
                  {uploadError && <p className="file-selection-error" role="alert">{uploadError}</p>}
                  <div className="review-intro">
                    <span className="review-check-icon">✓</span>
                    <div><strong>{files.length} {files.length === 1 ? 'file' : 'files'} ready to review</strong><span>Destination: {destination === 'both' ? 'This device and Google Drive' : destination === 'drive' ? 'Google Drive' : 'This device'}</span></div>
                  </div>
                  <ul className="review-file-list">
                    {files.map((file, index) => (
                      <li key={`${file.name}-${file.size}-${index}`}>
                        <span className="review-file-icon">▣</span>
                        <span className="review-file-name">{file.name}</span>
                        <span className="review-file-name">{progress[file.name]}%</span>
                        <span className="review-file-size">{file.isLink ? 'Web link' : formatSize(file.size)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="review-note">Your files are selected for import. You can go back to make changes or close this review.</p>
                </div>
                <footer className="add-notes-footer">
                  <span className="vault-encryption">
                    <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></svg>
                    Encrypted end-to-end in your private vault
                  </span>
                  <div className="add-notes-actions">
                    <button type="button" className="cancel-import-btn" onClick={() => setIsReviewing(false)}>Back to files</button>
                    <button type="button" className="bg-blue-600 rounded-lg p-1.5 text-white font-serif text-xs" disabled={uploading} onClick={handleuploadFiles}>
                      {uploading ? 'Saving…' : 'Upload Files'}
                    </button>
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default AddNotes
