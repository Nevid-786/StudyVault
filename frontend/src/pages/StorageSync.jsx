import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import SideBar from '../components/SideBar'
import TopBar from '../components/TopBar'
import { syncFilesWithGoogleDrive } from '../config/sync'
import GoogleDriveService from '../services/googleDrive'
import localDB from '../config/indexdb'
import SubjectService from '../services/subjectService'
import {
  DEFAULT_DASHBOARD_PREFERENCES,
  readDashboardPreferences,
  writeDashboardPreferences,
} from '../config/dashboardPreferences'
import {
  clearUserGeminiApiKey,
  getRagProvider,
  hasUserGeminiApiKey,
  RAG_PROVIDERS,
  saveUserGeminiApiKey,
} from '../features/revision/aiProvider'

const filters = ['All', 'Upload', 'Download']

const formatBytes = (value) => {
  const bytes = Number(value) || 0
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const getFileKind = (file) => {
  const extension = file.name?.split('.').pop()
  return extension ? extension.toUpperCase() : 'FILE'
}

const getFileCategory = (file) => {
  const type = (file.type || file.mimeType || '').toLowerCase()
  const extension = file.name?.split('.').pop()?.toLowerCase()
  if (type === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (type.includes('presentation') || ['ppt', 'pptx'].includes(extension)) return 'presentations'
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) return 'images'
  return 'other'
}

const Icon = ({ name, size = 18, className = '' }) => {
  const paths = {
    database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" /><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" /></>,
    cloud: <><path d="M20 16.2A4.5 4.5 0 0 0 18 7.5a6 6 0 0 0-11.5 1A4 4 0 0 0 7 16.4" /><path d="m9 13 3 3 3-3M12 16V9" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 4 4 6-7" /></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    network: <><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 7v4m0 0-7 6m7-6 7 6" /></>,
    merge: <><path d="M6 3v6a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v6" /><path d="m14 18 4 4 4-4M6 3v6a3 3 0 0 0 3 3h6" /></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    archive: <><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v11h14V9m-7 3v4m-2-2 2 2 2-2" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    sync: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    alert: <><path d="M10.3 3.9 2.5 17.4A1.8 1.8 0 0 0 4 20h16a1.8 1.8 0 0 0 1.5-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 3h.01" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5m5-5v12" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

const StatCard = ({ icon, iconClass, title, badge, children, footer }) => (
  <section className="flex min-h-56 flex-col justify-between gap-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
            <Icon name={icon} size={20} />
          </span>
          <h2 className="font-semibold text-slate-800">{title}</h2>
        </div>
        {badge}
      </div>
      {children}
    </div>
    {footer}
  </section>
)

const StorageSync = () => {
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const accessToken = useSelector((state) => state.auth.googleAccessToken)
  const [destination, setDestination] = useState(localStorage.getItem('destination') || 'both')
  const [ragProviderLoad] = useState(() => {
    const provider = getRagProvider()
    try {
      return {
        provider,
        hasUserApiKey: hasUserGeminiApiKey(),
        error: '',
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unable to read the Gemini API key for this tab.'
      return {
        provider,
        hasUserApiKey: false,
        error: provider === RAG_PROVIDERS.user ? errorMessage : '',
      }
    }
  })
  const ragProvider = ragProviderLoad.provider
  const [hasUserApiKey, setHasUserApiKey] = useState(ragProviderLoad.hasUserApiKey)
  const [userApiKeyDraft, setUserApiKeyDraft] = useState('')
  const [ragSettingsError, setRagSettingsError] = useState(ragProviderLoad.error)
  const [ragSettingsMessage, setRagSettingsMessage] = useState('')
  const [preferenceLoad] = useState(() => {
    try {
      return { preferences: readDashboardPreferences(), error: '' }
    } catch {
      return {
        preferences: DEFAULT_DASHBOARD_PREFERENCES,
        error: 'Saved dashboard preferences are invalid. Change a setting below to replace them.',
      }
    }
  })
  const [dashboardPreferences, setDashboardPreferences] = useState(preferenceLoad.preferences)
  const [dashboardPreferencesError, setDashboardPreferencesError] = useState(preferenceLoad.error)
  const [dashboardPreferencesMessage, setDashboardPreferencesMessage] = useState('')
  const folderId = useSelector((state) => state.auth.folderId)
  const [activeFilter, setActiveFilter] = useState('All')
  const [visibleActivity, setVisibleActivity] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [syncError, setSyncError] = useState('')
  const [vaultFiles, setVaultFiles] = useState([])
  const [vaultSubjects, setVaultSubjects] = useState([])
  const [storageEstimate, setStorageEstimate] = useState(null)
  const [vaultError, setVaultError] = useState('')
  const [cacheBusy, setCacheBusy] = useState(false)
  const [cacheMessage, setCacheMessage] = useState('')
  const [cacheError, setCacheError] = useState('')
  const [ufiles, setUfiles] = useState([])
  const [dfiles, setDfiles] = useState([])
  const [Uprogress, setUprogress] = useState(null)
  const [Dprogress, setDprogress] = useState(null)
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [backupError, setBackupError] = useState('')
  const [pendingBackup, setPendingBackup] = useState(null)
  const importInputRef = useRef(null)

  const displayedActivity = useMemo(
    () => visibleActivity.filter((item) => activeFilter === 'All' || item.action === activeFilter),
    [activeFilter, visibleActivity],
  )

  const fileComposition = useMemo(() => {
    const counts = { pdf: 0, presentations: 0, images: 0, other: 0 }
    vaultFiles.forEach((file) => { counts[getFileCategory(file)] += 1 })
    return counts
  }, [vaultFiles])
  const refreshVaultStats = useCallback(async () => {
    const [fileRows, subjectRows] = await Promise.all([
      localDB.getallfile(),
      SubjectService.getAllSubjects(),
    ])
    if (!Array.isArray(fileRows) || !Array.isArray(subjectRows)) {
      throw new TypeError('Local vault returned invalid storage statistics')
    }

    setVaultFiles(fileRows)
    setVaultSubjects(subjectRows)
    setVaultError('')

    const estimate = typeof navigator.storage?.estimate === 'function'
      ? await navigator.storage.estimate()
      : null
    setStorageEstimate(estimate ? { usage: estimate.usage || 0, quota: estimate.quota || 0 } : null)
  }, [])

  useEffect(() => {
    refreshVaultStats().catch((error) => {
      console.error('Unable to load local storage statistics:', error)
      setVaultError(error instanceof Error ? error.message : 'Unable to load local vault statistics.')
    })
  }, [refreshVaultStats])

  const updateDashboardPreference = (name, value) => {
    const updated = { ...dashboardPreferences, [name]: value }
    try {
      writeDashboardPreferences(updated)
      setDashboardPreferences(updated)
      setDashboardPreferencesError('')
      setDashboardPreferencesMessage('Dashboard preferences saved on this browser.')
    } catch (error) {
      console.error('Unable to save dashboard preferences:', error)
      setDashboardPreferencesError(error instanceof Error ? error.message : 'Unable to save dashboard preferences.')
      setDashboardPreferencesMessage('')
    }
  }

  const handleSaveUserApiKey = (event) => {
    event.preventDefault()
    try {
      saveUserGeminiApiKey(userApiKeyDraft)
      setHasUserApiKey(true)
      setUserApiKeyDraft('')
      setRagSettingsError('')
      setRagSettingsMessage('Gemini key saved for this browser tab only. It has not been verified yet.')
    } catch (error) {
      setRagSettingsError(error instanceof Error ? error.message : 'Unable to save the Gemini API key.')
      setRagSettingsMessage('')
    }
  }

  const handleClearUserApiKey = () => {
    try {
      clearUserGeminiApiKey()
      setHasUserApiKey(false)
      setUserApiKeyDraft('')
      setRagSettingsError('')
      setRagSettingsMessage('Your Gemini key was removed from this tab.')
    } catch (error) {
      setRagSettingsError(error instanceof Error ? error.message : 'Unable to clear the Gemini API key.')
      setRagSettingsMessage('')
    }
  }

  const handleExportBackup = async () => {
    setBackupBusy(true)
    setBackupError('')
    setBackupMessage('')
    try {
      const backup = await localDB.exportBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `study-vault-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
      setBackupMessage(`Backup exported with ${backup.database.stores.reduce((total, store) => total + store.records.length, 0)} records.`)
    } catch (error) {
      console.error('Unable to export the Study Vault backup:', error)
      setBackupError(error.message || 'Could not export the vault backup.')
    } finally {
      setBackupBusy(false)
    }
  }

  const handleBackupFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    setBackupError('')
    setBackupMessage('')
    setPendingBackup(null)

    if (!file) return

    try {
      const backup = JSON.parse(await file.text())
      localDB.validateBackup(backup)
      setPendingBackup({ name: file.name, data: backup })
    } catch (error) {
      console.error('Unable to read the selected Study Vault backup:', error)
      setBackupError(error.message || 'This file is not a valid Study Vault backup.')
    }
  }

  const handleImportBackup = async (mode) => {
    if (!pendingBackup) return
    setBackupBusy(true)
    setBackupError('')
    setBackupMessage('')
    try {
      const counts = await localDB.importBackup(pendingBackup.data, mode)
      const modeLabel = mode === 'replace' ? 'restored' : 'merged'
      setBackupMessage(`Backup ${modeLabel}: ${counts.imported} record${counts.imported === 1 ? '' : 's'} imported${counts.skipped ? `, ${counts.skipped} existing record${counts.skipped === 1 ? '' : 's'} skipped` : ''}.`)
      setPendingBackup(null)
      setDestination(localStorage.getItem('destination') || 'both')
      try {
        setDashboardPreferences(readDashboardPreferences())
        setDashboardPreferencesError('')
      } catch {
        setDashboardPreferencesError('The restored dashboard preferences are invalid. Change a setting below to replace them.')
      }
      await refreshVaultStats()
    } catch (error) {
      console.error('Unable to restore the Study Vault backup:', error)
      setBackupError(error.message || 'Could not restore the vault backup.')
    } finally {
      setBackupBusy(false)
    }
  }

  useEffect(() => {
    localStorage.setItem('destination', destination)
  }, [destination])


  const handleSyncCheck = async () => {
    setSyncError('')
    setSyncMessage('')
    setDprogress(null)
    setUprogress(null)
     
    if (!accessToken) {
      setSyncError('Connect Google Drive before checking sync status.')
      return
    }

    setSyncing(true)
    try {
      const { UFiles, DFiles } = await syncFilesWithGoogleDrive(accessToken)
      setUfiles(UFiles)
      setDfiles(DFiles)
      setActiveFilter('All')
      setVisibleActivity([
        ...UFiles.map((file) => ({
          id: `upload-${file.lid}`,
          action: 'Upload',
          name: file.name,
          subject: file.subject || 'Unknown subject',
          detail: formatBytes(file.size || file.file?.size),
          kind: getFileKind(file),
        })),
        ...DFiles.map((file) => ({
          id: `download-${file.id}`,
          action: 'Download',
          name: file.name,
          subject: file.appProperties?.subject || 'Unknown subject',
          detail: formatBytes(file.size),
          kind: getFileKind(file),
        })),
      ])
      const res = await SubjectService.createSubAndUnitSync(DFiles);
      setSyncMessage(`Sync check complete: ${UFiles.length} local file${UFiles.length === 1 ? '' : 's'} ready to upload and ${DFiles.length} Drive file${DFiles.length === 1 ? '' : 's'} ready to download.`)
    } catch (error) {
      console.error('Unable to check Google Drive sync status:', error)
      setSyncError(error instanceof Error ? error.message : 'Could not check Google Drive sync status.')
    } finally {
      setSyncing(false)
    }
  }

  const handleDownloadSync = async () => {
    if (!accessToken) {
      setSyncError('Connect Google Drive before downloading files.')
      return
    }

    setSyncing(true)
    setSyncError('')
    setSyncMessage(`Downloading ${dfiles.length} Drive file${dfiles.length === 1 ? '' : 's'}…`)
    try {
      await Promise.all(dfiles.map(async (file) => {
        const appProperties = file.appProperties || {}
        if (!appProperties.lid || !appProperties.semester || !appProperties.subject || !appProperties.unit) {
          throw new Error(`Drive file "${file.name}" is missing StudyVault location metadata and cannot be downloaded.`)
        }

        const downloadedFile = await GoogleDriveService.downloadFile(
          file.id,
          accessToken,
          (progress) => setDprogress((current) => ({ ...current, [appProperties.lid]: progress })),
          file.mimeType,
        )
        await localDB.upload(
          downloadedFile,
          file.name,
          appProperties.semester,
          appProperties.subject,
          appProperties.unit,
          file.mimeType,
          file.size || downloadedFile.size,
          appProperties.lid,
        )
      }))
      setDfiles([])
      setDprogress(null)
      setVisibleActivity((current) => current.filter((item) => item.action !== 'Download'))
      await refreshVaultStats()
      setSyncMessage('Drive files were downloaded to this device.')
    } catch (error) {
      console.error('Unable to download Drive files:', error)
      setSyncError(error instanceof Error ? error.message : 'Unable to download Drive files.')
    } finally {
      setSyncing(false)
    }
  }

  const handleUploadSync = async () => {
    if (!accessToken || !folderId) {
      setSyncError('Connect Google Drive and make sure the StudyVault folder is available before uploading.')
      return
    }

    setSyncing(true)
    setSyncError('')
    setSyncMessage(`Uploading ${ufiles.length} local file${ufiles.length === 1 ? '' : 's'}…`)
    try {
      await Promise.all(ufiles.map((file) => GoogleDriveService.uploadFile(
        folderId,
        file.file,
        accessToken,
        file.semester,
        file.subject,
        file.unit,
        file.lid,
        (percent) => setUprogress((current) => ({ ...current, [file.lid]: percent })),
      )))
      setUfiles([])
      setUprogress(null)
      setVisibleActivity((current) => current.filter((item) => item.action !== 'Upload'))
      setSyncMessage('Local files were uploaded to Google Drive.')
    } catch (error) {
      console.error('Unable to upload local files:', error)
      setSyncError(error instanceof Error ? error.message : 'Unable to upload local files.')
    } finally {
      setSyncing(false)
    }
  }

  const handleClearLocalCache = async () => {
    setCacheMessage('')
    setCacheError('')
    if (!vaultFiles.length) {
      setCacheMessage('There are no locally stored files to clear.')
      return
    }
    if (!window.confirm(`Remove ${vaultFiles.length} locally stored file${vaultFiles.length === 1 ? '' : 's'} from this browser? Subjects and Google Drive files will not be deleted.`)) {
      return
    }

    setCacheBusy(true)
    try {
      const deletedCount = await localDB.clearAllFiles()
      setUfiles([])
      setDfiles([])
      setVisibleActivity([])
      await refreshVaultStats()
      setCacheMessage(`${deletedCount} local file${deletedCount === 1 ? '' : 's'} removed. Subjects and Drive files were left unchanged.`)
    } catch (error) {
      console.error('Unable to clear locally stored files:', error)
      setCacheError(error instanceof Error ? error.message : 'Unable to clear locally stored files.')
    } finally {
      setCacheBusy(false)
    }
  }
  const localFileBytes = vaultFiles.reduce(
    (total, file) => total + (Number(file.size) || file.file?.size || 0),
    0,
  )
  const storagePercent = storageEstimate?.quota
    ? Math.min(100, (storageEstimate.usage / storageEstimate.quota) * 100)
    : 0
  const compositionPercent = (category) => vaultFiles.length
    ? (fileComposition[category] / vaultFiles.length) * 100
    : 0

  return (
    <div className="app-shell">
      <SideBar />
      <div className="main-content">
        <TopBar islogged={Boolean(user)} user={user} />
        <main className="page-scroll !gap-6 !px-4 !py-6 sm:!px-6 lg:!px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span className="text-indigo-600">Settings &amp; Management</span>
                  <span aria-hidden="true">/</span>
                  <span>Cloud &amp; Offline Storage</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Storage &amp; Sync</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                  Manage offline storage, cloud synchronization, backups, and file conflicts across your devices.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:items-end">
                <div className="text-sm text-slate-500">
                  <span className={`inline-flex items-center gap-2 font-medium ${accessToken ? 'text-teal-700' : 'text-amber-700'}`}>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${accessToken ? 'bg-teal-400' : 'bg-amber-400'}`} />
                      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${accessToken ? 'bg-teal-500' : 'bg-amber-500'}`} />
                    </span>
                    {accessToken ? 'Google Drive connected' : 'Connect Google Drive to sync'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSyncCheck}
                  disabled={syncing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                >
                  <Icon name="sync" className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Working…' : 'Check Sync Status'}
                </button>
              </div>
            </header>

            {(syncMessage || syncError) && (
              <div
                role={syncError ? 'alert' : 'status'}
                className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${syncError
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-teal-200 bg-teal-50 text-teal-800'
                  }`}
              >
                <Icon name={syncError ? 'alert' : 'check'} size={18} className="mt-0.5 shrink-0" />
                <span className="min-w-0 break-words">{syncError || syncMessage}</span>
                <button
                  type="button"
                  aria-label="Dismiss message"
                  onClick={() => {
                    setSyncMessage('')
                    setSyncError('')
                  }}
                  className="ml-auto rounded p-1 opacity-70 hover:opacity-100"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            )}
            {ragProvider === RAG_PROVIDERS.studyVault && hasUserApiKey && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-600">
                  A personal Gemini key is still saved in this tab, but is not currently selected.
                </p>
                <button
                  type="button"
                  onClick={handleClearUserApiKey}
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear saved key
                </button>
              </div>
            )}
            {vaultError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Local storage statistics could not be loaded: {vaultError}
              </p>
            )}

            {syncMessage && (ufiles.length > 0 || dfiles.length > 0) && (
              <div className="grid gap-4 lg:grid-cols-2">
                {ufiles.length > 0 && (
                  <section className="min-w-0 rounded-xl border border-teal-200 bg-teal-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-semibold text-teal-900">Local files ready to upload</h2>
                      <button
                        type="button"
                        disabled={syncing}
                        onClick={handleUploadSync}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        Upload
                      </button>
                    </div>
                    <ul className="mt-3 min-w-0 w-full divide-y divide-teal-200">
                      {ufiles.map((file) => {
                        const progress = Uprogress?.[file.lid]
                        return (
                          <li key={file.lid} className="min-w-0 py-2 text-sm text-teal-900">
                            <div className="flex min-w-0 items-center justify-between gap-3">
                              <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
                              <span className="shrink-0 text-xs">
                                {progress != null ? `${progress}%` : formatBytes(file.size || file.file?.size)}
                              </span>
                            </div>
                            {progress != null && (
                              <div
                                role="progressbar"
                                aria-label={`Upload progress for ${file.name}`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progress}
                                className="mt-2 h-1.5 overflow-hidden rounded-full bg-teal-100"
                              >
                                <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}
                {dfiles.length > 0 && (
                  <section className="min-w-0 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-semibold text-indigo-900">Drive files ready to download</h2>
                      <button
                        type="button"
                        disabled={syncing}
                        onClick={handleDownloadSync}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        Download
                      </button>
                    </div>
                    <ul className="mt-3 min-w-0 w-full divide-y divide-indigo-200">
                      {dfiles.map((file) => {
                        const lid = file.appProperties?.lid
                        const progress = lid ? Dprogress?.[lid] : null
                        return (
                          <li key={file.id} className="min-w-0 py-2 text-sm text-indigo-900">
                            <div className="flex min-w-0 items-center justify-between gap-3">
                              <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
                              <span className="shrink-0 text-xs">
                                {progress
                                  ? progress.progress == null
                                    ? `${formatBytes(progress.received)} received`
                                    : `${progress.progress}% · ${formatBytes(progress.received)}`
                                  : formatBytes(file.size)}
                              </span>
                            </div>
                            {progress && (
                              <div
                                role="progressbar"
                                aria-label={`Download progress for ${file.name}`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progress.progress ?? undefined}
                                className="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100"
                              >
                                <div
                                  className={`h-full rounded-full bg-indigo-600 transition-all ${progress.progress == null ? 'animate-pulse' : ''}`}
                                  style={{ width: progress.progress == null ? '35%' : `${progress.progress}%` }}
                                />
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}
              </div>
            )}

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                icon="database"
                iconClass="bg-indigo-50 text-indigo-600"
                title="Local Device Cache"
                badge={<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">IndexedDB</span>}
                footer={
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('/subjects')}
                        className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        Manage files
                      </button>
                      <button
                        type="button"
                        onClick={handleClearLocalCache}
                        disabled={cacheBusy || !vaultFiles.length}
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cacheBusy ? 'Clearing…' : 'Clear local files'}
                      </button>
                    </div>
                    {(cacheMessage || cacheError) && (
                      <p role={cacheError ? 'alert' : 'status'} className={`mt-3 text-xs ${cacheError ? 'text-rose-700' : 'text-teal-700'}`}>
                        {cacheError || cacheMessage}
                      </p>
                    )}
                  </div>
                }
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{formatBytes(localFileBytes)}</span>
                  <span className="text-sm font-semibold text-slate-500">{vaultFiles.length} files</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${storagePercent}%` }} />
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  {storageEstimate
                    ? `${formatBytes(storageEstimate.usage)} of ${formatBytes(storageEstimate.quota)} browser storage used.`
                    : 'Browser storage estimates are not available in this browser.'}
                </p>
              </StatCard>

              <StatCard
                icon="cloud"
                iconClass="bg-teal-50 text-teal-700"
                title="Google Drive Sync"
                badge={<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${accessToken ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${accessToken ? 'bg-teal-500' : 'bg-amber-500'}`} />{accessToken ? 'Connected' : 'Not connected'}</span>}
                footer={
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span>Sync is started manually</span>
                    <span className={`font-medium ${accessToken ? 'text-teal-700' : 'text-amber-700'}`}>{accessToken ? 'Ready to check' : 'Sign in required'}</span>
                  </div>
                }
              >
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">Connected account</span>
                    <span className="max-w-[180px] truncate font-medium text-slate-800">{accessToken ? user?.email || 'Google account connected' : 'Connect an account to sync'}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">Remote storage</span>
                    <span className="font-medium text-slate-800">Google Drive</span>
                  </div>
                </div>
                <p className="text-xs leading-5 text-slate-500">Compare local files with Drive to identify items that need attention.</p>
              </StatCard>

              <StatCard
                icon="chart"
                iconClass="bg-violet-50 text-violet-700"
                title="Vault Composition"
                badge={<span className="text-xs font-medium text-slate-500">Storage overview</span>}
                footer={
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                    <span><i className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-rose-500" />PDF documents</span>
                    <span><i className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-amber-500" />Presentations</span>
                    <span><i className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-emerald-500" />Images</span>
                    <span><i className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-blue-500" />Other files</span>
                  </div>
                }
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{vaultFiles.length} files</span>
                  <span className="text-xs text-slate-500">Across {vaultSubjects.length} subjects</span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <span className="bg-rose-500" style={{ width: `${compositionPercent('pdf')}%` }} />
                  <span className="bg-amber-500" style={{ width: `${compositionPercent('presentations')}%` }} />
                  <span className="bg-emerald-500" style={{ width: `${compositionPercent('images')}%` }} />
                  <span className="bg-blue-500" style={{ width: `${compositionPercent('other')}%` }} />
                </div>
                <p className="text-xs leading-5 text-slate-500">Distribution of files currently saved in this browser.</p>
              </StatCard>
            </section>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              <div className="flex flex-col gap-6 lg:col-span-7">
                <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900">Storage destination</h2>
                      <p className="mt-1 text-sm text-slate-500">Choose where newly added files are stored.</p>
                    </div>
                    <span className="hidden rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 sm:inline-flex">Storage preference</span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {[
                      { id: 'device', title: 'This device only', summary: 'Keep files in browser storage for offline access.' },
                      { id: 'drive', title: 'Google Drive only', summary: 'Store files in Drive and access them when needed.' },
                      { id: 'both', title: 'Both (recommended)', summary: 'Keep local access while using Drive as a cloud copy.' },
                    ].map((option) => (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${destination === option.id ? 'border-indigo-300 bg-indigo-50/70' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        <input
                          type="radio"
                          name="storage-destination"
                          value={option.id}
                          checked={destination === option.id}
                          onChange={() => setDestination(option.id)}
                          className="mt-1 h-4 w-4 accent-indigo-600"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">{option.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">{option.summary}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                  <div>
                    <h2 className="font-semibold text-slate-900">Study assistant AI access</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {ragProvider === RAG_PROVIDERS.user
                        ? 'This deployment requires your own Gemini API key for study-material indexing and assistant replies.'
                        : "This deployment uses StudyVault's configured Gemini service."}
                    </p>
                  </div>

                  {ragProvider === RAG_PROVIDERS.user && (
                    <div className="mt-4 space-y-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                      <div className="space-y-2 text-xs leading-5 text-slate-700">
                        <p>
                          Your key is stored in this tab's session storage only. It is not sent to StudyVault's backend,
                          saved in local storage, or included in vault backups. Requests containing the key and study
                          text are sent directly to Google over HTTPS.
                        </p>
                        <p>
                          Session storage is not encrypted and scripts running on this site can access it. Use a
                          dedicated key, restrict it to the Generative Language API and your site where available,
                          and clear it when finished. Create or manage keys in{' '}
                          <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-indigo-700 underline hover:text-indigo-900"
                          >
                            Google AI Studio
                          </a>.
                        </p>
                      </div>
                      <form onSubmit={handleSaveUserApiKey} className="space-y-2">
                        <label htmlFor="gemini-api-key" className="block text-sm font-semibold text-slate-800">
                          Gemini API key
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            id="gemini-api-key"
                            name="gemini-api-key"
                            type="password"
                            autoComplete="off"
                            spellCheck="false"
                            value={userApiKeyDraft}
                            onChange={(event) => setUserApiKeyDraft(event.target.value)}
                            placeholder={hasUserApiKey ? 'Key saved for this tab' : 'Paste your Gemini API key'}
                            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                          />
                          <button
                            type="submit"
                            disabled={!userApiKeyDraft.trim()}
                            className="h-11 shrink-0 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Save for this tab
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">
                          {hasUserApiKey ? 'A key is saved in this tab. It will be sent only to Google when you use Gemini.' : 'No user key is saved. This mode will not fall back to StudyVault’s key.'}
                        </p>
                      </form>
                      <button
                        type="button"
                        onClick={handleClearUserApiKey}
                        disabled={!hasUserApiKey}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Clear saved key
                      </button>
                    </div>
                  )}
                  {ragProvider === RAG_PROVIDERS.studyVault && hasUserApiKey && (
                    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-slate-600">
                        A personal Gemini key is saved in this tab but is not used by this deployment.
                      </p>
                      <button
                        type="button"
                        onClick={handleClearUserApiKey}
                        className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Clear saved key
                      </button>
                    </div>
                  )}
                  {(ragSettingsMessage || ragSettingsError) && (
                    <p role={ragSettingsError ? 'alert' : 'status'} className={`mt-3 text-xs ${ragSettingsError ? 'text-rose-700' : 'text-teal-700'}`}>
                      {ragSettingsError || ragSettingsMessage}
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900">Home dashboard preferences</h2>
                      <p className="mt-1 text-sm text-slate-500">These saved preferences immediately change your Home page.</p>
                    </div>
                    <Icon name="activity" className="text-indigo-600" />
                  </div>
                  {[
                    { id: 'showSubjects', title: 'Show subject overview', summary: 'Display your saved subjects on Home.' },
                    { id: 'showRecentFiles', title: 'Show recently added files', summary: 'Display local files with a shortcut to their viewer.' },
                  ].map((preference) => (
                    <label key={preference.id} className="flex cursor-pointer items-center justify-between gap-4 border-b border-slate-100 py-4">
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">{preference.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{preference.summary}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={dashboardPreferences[preference.id]}
                        onChange={(event) => updateDashboardPreference(preference.id, event.target.checked)}
                        className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-teal-500 checked:before:translate-x-[18px]"
                      />
                    </label>
                  ))}
                  <label htmlFor="recent-file-limit" className="mt-4 block text-sm font-semibold text-slate-800">
                    Recent files shown
                  </label>
                  <select
                    id="recent-file-limit"
                    value={dashboardPreferences.recentFileLimit}
                    onChange={(event) => updateDashboardPreference('recentFileLimit', Number(event.target.value))}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    {[3, 5, 8, 10].map((count) => <option key={count} value={count}>{count} files</option>)}
                  </select>
                  {(dashboardPreferencesMessage || dashboardPreferencesError) && (
                    <p role={dashboardPreferencesError ? 'alert' : 'status'} className={`mt-3 text-xs ${dashboardPreferencesError ? 'text-rose-700' : 'text-teal-700'}`}>
                      {dashboardPreferencesError || dashboardPreferencesMessage}
                    </p>
                  )}
                </section>
              </div>

              <div className="flex flex-col gap-6 lg:col-span-5">
                <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon name="activity" className="text-indigo-600" />
                      <h2 className="font-semibold text-slate-900">Current sync candidates</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVisibleActivity([])}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Clear candidates
                    </button>
                  </div>
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {filters.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setActiveFilter(filter)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeFilter === filter ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {filter} {filter === 'All' ? `(${visibleActivity.length})` : `(${visibleActivity.filter((item) => item.action === filter).length})`}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 divide-y divide-slate-100">
                    {displayedActivity.length ? displayedActivity.map((item) => (
                      <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-8 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${item.action === 'Upload' ? 'bg-teal-50 text-teal-700' : 'bg-indigo-50 text-indigo-700'
                            }`}>{item.kind}</span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800" title={item.name}>{item.name}</p>
                            <p className="mt-1 truncate text-[11px] text-slate-500">{item.subject} · {item.detail}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 text-[11px] font-medium ${item.action === 'Upload' ? 'text-teal-700' : 'text-indigo-700'}`}>
                          {item.action} pending
                        </span>
                      </div>
                    )) : (
                      <p className="py-8 text-center text-sm text-slate-500">Run a sync check to see files that can be transferred.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-2">
                    <Icon name="archive" className="text-indigo-600" />
                    <h2 className="font-semibold text-slate-900">Backup &amp; export utilities</h2>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-500">Back up all local subjects, units, files, file contents, and storage preferences. Google sign-in credentials are never included.</p>
                  {(backupMessage || backupError) && (
                    <p role={backupError ? 'alert' : 'status'} className={`mt-3 text-sm ${backupError ? 'text-rose-700' : 'text-teal-700'}`}>
                      {backupError || backupMessage}
                    </p>
                  )}
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleBackupFile}
                    className="hidden"
                    aria-label="Choose a Study Vault backup file"
                  />
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      disabled={backupBusy}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-left transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      <span className="rounded-lg bg-indigo-100 p-2 text-indigo-700"><Icon name="download" size={18} /></span>
                      <span><span className="block text-sm font-semibold text-slate-800">{backupBusy ? 'Preparing backup…' : 'Export full vault'}</span><span className="mt-0.5 block text-xs text-slate-500">Download a complete JSON backup, including file contents</span></span>
                    </button>
                    <button
                      type="button"
                      onClick={() => importInputRef.current?.click()}
                      disabled={backupBusy}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-left transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      <span className="rounded-lg bg-teal-100 p-2 text-teal-700"><Icon name="upload" size={18} /></span>
                      <span><span className="block text-sm font-semibold text-slate-800">Import backup archive</span><span className="mt-0.5 block text-xs text-slate-500">Choose a Study Vault JSON backup to restore</span></span>
                    </button>
                  </div>
                  {pendingBackup && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="break-all text-sm font-semibold text-amber-900">Restore {pendingBackup.name}?</p>
                      <p className="mt-1 text-xs leading-5 text-amber-800">Choose whether to replace this device’s vault or add backup records without overwriting existing records.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleImportBackup('replace')} disabled={backupBusy} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">Replace vault</button>
                        <button type="button" onClick={() => handleImportBackup('merge')} disabled={backupBusy} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60">Merge backup</button>
                        <button type="button" onClick={() => setPendingBackup(null)} disabled={backupBusy} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-60">Cancel</button>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default StorageSync
