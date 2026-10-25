import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import SideBar from '../components/SideBar'
import TopBar from '../components/TopBar'
import { syncFilesWithGoogleDrive } from '../config/sync'
import GoogleDriveService from '../services/googleDrive'
import localDB from '../config/indexdb'

const activityItems = [
  { id: 1, name: 'Maxwell_Equations_Electromagnetism.pdf', subject: 'Physics', detail: '4.8 MB', status: 'Synced', time: '2m ago', kind: 'PDF' },
  { id: 2, name: 'Orbital_Hybridization_Reaction_Kinetics.pptx', subject: 'Chemistry', detail: '13.6 MB', status: 'Synced', time: '14m ago', kind: 'PPT' },
  { id: 3, name: 'Differential_Calculus_Board_Capture.png', subject: 'Mathematics', detail: 'Queued (Wi-Fi only)', status: 'Pending', time: '2.4 MB', kind: 'IMG' },
  { id: 4, name: 'RISC-V_Hardware_Manual_v2.pdf', subject: 'CS-310', detail: 'Conflict auto-merged', status: 'Synced', time: 'Resolved', kind: 'PDF' },
  { id: 5, name: 'Biochem_Lab_Analysis_Report.pdf', subject: 'Biology', detail: 'Drive quota timeout', status: 'Errors', time: 'Retry', kind: 'PDF' },
]

const filters = ['All', 'Synced', 'Pending', 'Errors']

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
  const user = useSelector((state) => state.auth.user)
  const accessToken = useSelector((state) => state.auth.googleAccessToken)
  const [destination, setDestination] = useState(localStorage.getItem('destination') || 'both')
  const [preferences, setPreferences] = useState({
    autoSync: true,
    wifiOnly: true,
    offlineFiles: true,
    backgroundOcr: true,
  })
  const folderId = useSelector((state) => state.auth.folderId)
  const [conflictStrategy, setConflictStrategy] = useState('Ask every time (Show interactive diff)')
  const [activeFilter, setActiveFilter] = useState('All')
  const [visibleActivity, setVisibleActivity] = useState(activityItems)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [syncError, setSyncError] = useState('')
  const [usedStorage, setUsedStorage] = useState("")
  const [storageAllocated, setStorageAllocated] = useState("");
  const [ufiles, setUfiles] = useState([]);
  const [dfiles, setDfiles] = useState([]);
  const [Uprogress, setUprogress] = useState(null); //uploadprogress
  const [Dprogress, setDprogress] = useState(null); //uploadprogress
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [backupError, setBackupError] = useState('')
  const [pendingBackup, setPendingBackup] = useState(null)
  const importInputRef = useRef(null)


  const displayedActivity = useMemo(
    () => visibleActivity.filter((item) => activeFilter === 'All' || item.status === activeFilter),
    [activeFilter, visibleActivity],
  )

  const togglePreference = (name) => {
    setPreferences((current) => ({ ...current, [name]: !current[name] }))
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
      await checkStorageUsage()
    } catch (error) {
      console.error('Unable to restore the Study Vault backup:', error)
      setBackupError(error.message || 'Could not restore the vault backup.')
    } finally {
      setBackupBusy(false)
    }
  }

  async function checkStorageUsage() {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage, quota, usageDetails } = await navigator.storage.estimate();

      console.log(`Used space: ${usage} bytes (${(usage / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`Total quota: ${quota} bytes (${(quota / 1024 / 1024).toFixed(2)} MB)`);
      setUsedStorage((usage / 1024 / 1024).toFixed(2))
      setStorageAllocated((quota / 1024 / 1024 / 1024).toFixed(2))
      // Detailed breakdown (Supported in Chrome, Edge, Opera)
      if (usageDetails) {
        console.log('Breakdown:', usageDetails);
        // e.g., { indexedDB: 123456, caches: 654321, ... }
      }
    } else {
      console.log('Storage Estimation API not supported.');
    }
  }

  useEffect(() => {
    checkStorageUsage();

    return () => {

    }
  }, [])
  useEffect(() => {
    localStorage.setItem("destination", destination);


  }, [destination])


  const handle_download_Sync = async () => {
    const download_result = await Promise.all(dfiles.map(async (file) => {
      const downloadedFile = await GoogleDriveService.downloadFile(file.id, accessToken,
        ({ progress }) => {
          setDprogress((prev) => ({
            ...prev,
            [file.appProperties.lid]: progress,
          }))
        },
        file.mimeType
      )
      const data = {
        file: downloadedFile,
        lid: file.appProperties.lid,
        subject: file.appProperties.subject,
        semester: file.appProperties.semester,
        unit: file.appProperties.unit,
        name: file.name,
        type: file.mimeType,
        size: file.size

      }
      return data;
    }))
    console.log("download_result", download_result)
    download_result.forEach(async (file) => {
      const res = await localDB.upload(file.file, file.name, file.semester, file.subject, file.unit, file.type, file.size, file.lid)
      console.log("File saved to IndexedDB with ID:", res);
    }
    )
    setDfiles([]);
    setUprogress(null);
    setSyncMessage("Files Downloaded SuccessFully");

  }
  const handle_upload_sync = async () => {
    await Promise.all(ufiles.map(async (file) => {
      // Upload each file to Google Drive
      if (!folderId) { console.log("No root Folder found") };
      await GoogleDriveService.uploadFile(
        folderId,
        file.file,
        accessToken,
        file.semester,
        file.subject,
        file.unit,
        file.lid,
        (percent) => {
          setUprogress((prev) => ({
            ...prev,
            [file.lid]: percent,
          }))
        })
    }))

    setUfiles([]);
    setSyncMessage("Files Uploaded SuccessFully");


  }

  const handleSyncCheck = async () => {
    setSyncError('')
    setSyncMessage('')

    if (!accessToken) {
      setSyncError('Connect Google Drive before checking sync status.')
      return
    }

    setSyncing(true)
    try {
      const { UFiles, DFiles } = await syncFilesWithGoogleDrive(accessToken)
      setUfiles(UFiles)
      setDfiles(DFiles)




      setSyncMessage(`Sync check complete: ${UFiles.length} local file${UFiles.length === 1 ? '' : 's'} to upload and ${DFiles.length} Drive file${DFiles.length === 1 ? '' : 's'} to download.`)
    } catch (error) {
      console.error('Unable to check Google Drive sync status:', error)
      setSyncError('Could not check Google Drive sync status. Please try again.')
    } finally {
      setSyncing(false)
    }
  }
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
                  <span className="inline-flex items-center gap-2 font-medium text-teal-700">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
                    </span>
                    Drive status is ready to check
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSyncCheck}
                  disabled={syncing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                >
                  <Icon name="sync" className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Checking…' : 'Check Sync Status'}
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
                <span>{syncError || syncMessage}</span>
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
            {
              syncMessage && (
                <div >

                  
                  {ufiles.length > 0 && <div className={`flex flex-col items-start border-rose-200 bg-teal-50 text-teal-700 gap-2 rounded-xl border px-4 py-3 text-sm`}> <ul className='w-full list-decimal'>{ufiles.map((f) => (

                    <div key={f.lid} className="flex justify-between w-full">
                      <li className='flex-1'>
                        {f.name}

                      </li> 
                     
                        {Uprogress!=null && (
                          <span className='mr-3'>
                        {Uprogress[f.lid]}%</span>
                        )} <span>
                        Size:{(f.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>

                  ))}
                  </ul>
                    <div className="
                flex justify-between w-full">
                      <span className='text-xl text-gray-400 bg-rose
                  3
                  -500 w-full p-1 rounded-tl-lg rounded-bl-lg '>
                      Upload Local files to Cloud
                      </span>
                      <button 
                      disabled={ufiles.length==0}
                      className='inline-flex min-h-11
                       items-center justify-center gap-2 rounded-xl bg-indigo-600
                        px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60' onClick={handle_upload_sync}>
                        Upload
                      </button>

                    </div>
                  </div>}


                  {dfiles.length > 0 && <div className={`flex flex-col items-start border-rose-200 bg-rose-50 text-rose-700 gap-2 rounded-xl border px-4 py-3 text-sm`}> <ul className='w-full list-decimal'>{dfiles.map((f) => (

                   <div key={f.lid} className="flex justify-between w-full">
                      <li className='flex-1'>
                        {f.name}

                      </li> 
                     
                        {Dprogress!=null && (
                          <span className='mr-3'>
                        {Dprogress[f.appProperties.lid]}%</span>
                        )} <span>
                        Size:{(f.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>

                  ))}
                  </ul>
                    <div className="
                flex justify-between w-full">
                      <span className='text-xl text-gray-400 bg-rose
                  3
                  -500 w-full p-1 rounded-tl-lg rounded-bl-lg '>
                        Download Cloud Files to Local DB
                      </span>
                      <button 
                      disabled={
                        dfiles.length==0
                      }className='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait  disabled:opacity-60' onClick={handle_download_Sync}>
                       Download
                      </button>

                    </div>
                  </div>}




                </div>
              )

            }

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                icon="database"
                iconClass="bg-indigo-50 text-indigo-600"
                title="Local Device Cache"
                badge={<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">IndexedDB</span>}
                footer={
                  <div className="flex gap-2 border-t border-slate-100 pt-4">
                    <button type="button" className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200">Manage offline files</button>
                    <button type="button" className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700">Clear cache</button>
                  </div>
                }
              >
                <div className="flex items-baseline justify-between">
                  <div><span className="text-2xl font-bold text-slate-900">{usedStorage} MB</span><span className="ml-1.5 text-sm text-slate-500">/{storageAllocated}GB</span></div>
                  <span className="text-sm font-semibold text-teal-700">{((usedStorage / (storageAllocated * 1024)) * 100).toFixed(2)}% used</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${((usedStorage / (storageAllocated * 1024)) * 100).toFixed(2)}%` }} />
                </div>
                <p className="text-xs leading-5 text-slate-500">Cached files and offline annotations available on this device.</p>
              </StatCard>

              <StatCard
                icon="cloud"
                iconClass="bg-teal-50 text-teal-700"
                title="Google Drive Sync"
                badge={<span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" />{user ? 'Connected' : 'Not connected'}</span>}
                footer={
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span>Automatic sync check</span>
                    <span className="font-medium text-teal-700">Available</span>
                  </div>
                }
              >
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">Connected account</span>
                    <span className="max-w-[180px] truncate font-medium text-slate-800">{user?.email || 'Connect an account to sync'}</span>
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
                  <span className="text-2xl font-bold text-slate-900">142 files</span>
                  <span className="text-xs text-slate-500">Across 4 subjects</span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <span className="w-[44%] bg-rose-500" />
                  <span className="w-[26%] bg-amber-500" />
                  <span className="w-[20%] bg-emerald-500" />
                  <span className="w-[10%] bg-blue-500" />
                </div>
                <p className="text-xs leading-5 text-slate-500">A quick overview of the files in your study vault.</p>
              </StatCard>
            </section>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              <div className="flex flex-col gap-6 lg:col-span-7">
                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
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

                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900">Sync &amp; network rules</h2>
                      <p className="mt-1 text-sm text-slate-500">Choose how sync behaves on this device.</p>
                    </div>
                    <span className="hidden text-xs font-medium text-teal-700 sm:inline">Preferences</span>
                  </div>
                  <div className="mt-4 divide-y divide-slate-100">
                    {[
                      { id: 'autoSync', title: 'Auto-sync on file change', summary: 'Check for changes when files are modified.' },
                      { id: 'wifiOnly', title: 'Sync over Wi-Fi only', summary: 'Prefer Wi-Fi for larger file transfers.' },
                      { id: 'offlineFiles', title: 'Keep downloaded files offline', summary: 'Make downloaded files available without a connection.' },
                      { id: 'backgroundOcr', title: 'Background text extraction', summary: 'Allow text extraction to run in the background.' },
                    ].map((preference) => (
                      <label key={preference.id} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">{preference.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">{preference.summary}</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={preferences[preference.id]}
                          onChange={() => togglePreference(preference.id)}
                          className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-teal-500 checked:before:translate-x-[18px]"
                        />
                      </label>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900">Sync conflict resolution</h2>
                      <p className="mt-1 text-sm text-slate-500">Choose what to do when a file has changed in two places.</p>
                    </div>
                    <Icon name="merge" className="text-indigo-600" />
                  </div>
                  <label className="sr-only" htmlFor="conflict-strategy">Conflict resolution strategy</label>
                  <select
                    id="conflict-strategy"
                    value={conflictStrategy}
                    onChange={(event) => setConflictStrategy(event.target.value)}
                    className="mt-5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option>Ask every time (Show interactive diff)</option>
                    <option>Keep newer version automatically (Timestamp precedence)</option>
                    <option>Keep device version (Overwrite cloud)</option>
                    <option>Keep Drive version (Overwrite local cache)</option>
                  </select>
                  <div className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                    <Icon name="alert" className="mt-0.5 shrink-0 text-amber-600" />
                    <p className="text-xs leading-5">When versions conflict, review the files before choosing which copy to keep.</p>
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-6 lg:col-span-5">
                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon name="activity" className="text-indigo-600" />
                      <h2 className="font-semibold text-slate-900">Recent sync activity</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVisibleActivity([])}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Clear log
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
                        {filter} {filter === 'All' ? `(${visibleActivity.length})` : `(${visibleActivity.filter((item) => item.status === filter).length})`}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 divide-y divide-slate-100">
                    {displayedActivity.length ? displayedActivity.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-8 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${item.kind === 'PDF' ? 'bg-rose-50 text-rose-700' : item.kind === 'PPT' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>{item.kind}</span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800">{item.name}</p>
                            <p className="mt-1 truncate text-[11px] text-slate-500">{item.subject} · {item.detail}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 text-[11px] font-medium ${item.status === 'Errors' ? 'text-rose-600' : item.status === 'Pending' ? 'text-amber-600' : 'text-teal-700'
                          }`}>{item.status === 'Errors' ? 'Needs attention' : item.time}</span>
                      </div>
                    )) : (
                      <p className="py-8 text-center text-sm text-slate-500">No activity to show.</p>
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
                      <p className="text-sm font-semibold text-amber-900">Restore {pendingBackup.name}?</p>
                      <p className="mt-1 text-xs leading-5 text-amber-800">Choose whether to replace this device’s vault or add backup records without overwriting existing records.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleImportBackup('replace')} disabled={backupBusy} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">Replace vault</button>
                        <button type="button" onClick={() => handleImportBackup('merge')} disabled={backupBusy} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60">Merge backup</button>
                        <button type="button" onClick={() => setPendingBackup(null)} disabled={backupBusy} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-60">Cancel</button>
                      </div>
                    </div>
                  )}
                  <button type="button" className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700">
                    <Icon name="close" size={15} /> Delete local cache
                  </button>
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
