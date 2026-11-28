import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { loadmanifest } from '../stores/fileSlice'
import SideBar from '../components/SideBar'
import TopBar from '../components/TopBar'
import subjectService from '../services/subjectService'
import localDB from '../config/indexdb'
import {
  DEFAULT_DASHBOARD_PREFERENCES,
  readDashboardPreferences,
} from '../config/dashboardPreferences'
import { getViewerPath } from '../utils/fileViewer'

const formatBytes = (value) => {
  const bytes = Number(value) || 0
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const FOCUS_DURATION_SECONDS = 25 * 60

const getFileType = (file) => {
  const extension = file.name?.split('.').pop()
  return extension ? extension.toUpperCase() : 'FILE'
}

const Home = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const [subjects, setSubjects] = useState([])
  const [files, setFiles] = useState([])
  const [lastOpened, setLastOpened] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [search, setSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [focusSeconds, setFocusSeconds] = useState(FOCUS_DURATION_SECONDS)
  const [focusRunning, setFocusRunning] = useState(false)
  const [preferenceState] = useState(() => {
    try {
      return { preferences: readDashboardPreferences(), error: '' }
    } catch {
      return {
        preferences: DEFAULT_DASHBOARD_PREFERENCES,
        error: 'Dashboard preferences could not be read. You can update them in Storage & Sync.',
      }
    }
  })
  const dashboardPreferences = preferenceState.preferences

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      setLoading(true)
      setError('')
      try {
        dispatch(loadmanifest())
        const [subjectRows, fileRows] = await Promise.all([
          subjectService.getAllSubjects(),
          localDB.getallfile(),
        ])
        if (!Array.isArray(subjectRows) || !Array.isArray(fileRows)) {
          throw new TypeError('The local vault returned invalid dashboard data')
        }
        if (active) {
          setSubjects(subjectRows)
          setFiles(fileRows)
        }
        try {
          const lastOpenedFile = await localDB.getLastOpenedFile()
          if (active) {
            setLastOpened(lastOpenedFile)
            setHistoryError('')
          }
        } catch (historyLoadError) {
          console.error('Unable to load reading history:', historyLoadError)
          if (active) setHistoryError('Reading history is unavailable; your saved files are still accessible.')
        }
      } catch (loadError) {
        console.error('Unable to load the StudyVault dashboard:', loadError)
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load your study data.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()
    const refreshOnFocus = () => setReloadKey((current) => current + 1)
    window.addEventListener('focus', refreshOnFocus)
    return () => {
      active = false
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [dispatch, reloadKey])

  // A one-second timeout keeps the focus countdown paused cleanly when the user leaves Home.
  useEffect(() => {
    if (!focusRunning || focusSeconds === 0) return undefined
    const timer = window.setTimeout(() => {
      setFocusSeconds((remaining) => Math.max(0, remaining - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [focusRunning, focusSeconds])

  const query = search.trim().toLowerCase()
  const matchingSubjects = useMemo(
    () => subjects.filter((subject) => (subject.name || '').toLowerCase().includes(query)),
    [query, subjects],
  )
  const recentFiles = useMemo(
    () => files
      .filter((file) => !query || (file.name || '').toLowerCase().includes(query))
      .sort((left, right) => (right.id || 0) - (left.id || 0))
      .slice(0, dashboardPreferences.recentFileLimit),
    [dashboardPreferences.recentFileLimit, files, query],
  )

  const totalBytes = files.reduce((total, file) => total + (Number(file.size) || file.file?.size || 0), 0)
  const semesterCount = new Set(subjects.map((subject) => subject.semester).filter(Boolean)).size
  const firstName = user?.name?.trim().split(/\s+/)[0] || user?.email?.split('@')[0] || 'there'
  const progressPage = Number(lastOpened?.progress?.pageNumber)
  const progressPageCount = Number(lastOpened?.progress?.pageCount)
  const progressPercent = progressPageCount > 0
    ? Math.min(100, Math.round((progressPage / progressPageCount) * 100))
    : null
  const focusTime = `${String(Math.floor(focusSeconds / 60)).padStart(2, '0')}:${String(focusSeconds % 60).padStart(2, '0')}`

  const openFile = (file) => {
    const viewerPath = getViewerPath(file)
    if (viewerPath) {
      window.open(viewerPath, '_blank', 'noopener,noreferrer')
      return
    }

    if (file.file instanceof Blob) {
      const objectUrl = URL.createObjectURL(file.file)
      window.open(objectUrl, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    }
  }

  return (
    <div className="app-shell">
      <SideBar />
      <div className="main-content">
        <TopBar islogged={Boolean(user)} user={user} />

        <main className="page-scroll !gap-6 !px-4 !py-6 sm:!px-6 lg:!px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-7">
            <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Your academic workspace
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Welcome back, {firstName}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                  Your local vault has {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'} and{' '}
                  {files.length} saved {files.length === 1 ? 'file' : 'files'}.
                </p>
              </div>
              <label className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm lg:max-w-sm">
                <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  aria-label="Search subjects and saved files"
                  placeholder="Search subjects and files"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </label>
            </header>

            {preferenceState.error && (
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {preferenceState.error}
              </p>
            )}

            {error && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
                <p className="font-semibold">Your dashboard could not load local vault data.</p>
                <p className="mt-1 text-sm">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((current) => current + 1)}
                  className="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                >
                  Try again
                </button>
              </div>
            )}

            <section aria-label="Vault summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Subjects', value: subjects.length, detail: `${semesterCount} ${semesterCount === 1 ? 'semester' : 'semesters'}`, icon: '📚' },
                { label: 'Study units', value: subjects.reduce((total, subject) => total + (subject.units?.length || 0), 0), detail: 'Across your subjects', icon: '🗂️' },
                { label: 'Saved files', value: files.length, detail: 'Available in this browser', icon: '📄' },
                { label: 'File data', value: formatBytes(totalBytes), detail: 'Stored in your local vault', icon: '💾' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">{stat.label}</span>
                    <span aria-hidden="true" className="text-xl">{stat.icon}</span>
                  </div>
                  <div className="mt-3 text-2xl font-bold text-slate-900">{loading ? '…' : stat.value}</div>
                  <div className="mt-1 text-xs text-slate-500">{stat.detail}</div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl bg-gradient-to-br from-indigo-700 to-violet-700 p-6 text-white shadow-sm sm:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-medium text-indigo-100">Pick up where you left off</p>
                  <h2 className="mt-1 text-xl font-bold sm:text-2xl">Your subjects and study materials</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
                    Browse your saved units, add course materials, or ask questions using your indexed study files.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/subjects')}
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                  >
                    Browse subjects
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/revision')}
                    className="rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Open study assistant
                  </button>
                </div>
              </div>
            </section>

            <section aria-label="Resume reading" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-indigo-600">Resume reading</p>
                  {lastOpened ? (
                    <>
                      <h2 className="mt-1 truncate text-lg font-semibold text-slate-900" title={lastOpened.file.name}>
                        {lastOpened.file.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {progressPageCount > 0
                          ? `Page ${progressPage} of ${progressPageCount} · ${progressPercent}% complete`
                          : 'Last opened in its document viewer'}
                      </p>
                      {progressPercent !== null && (
                        <div
                          role="progressbar"
                          aria-label="Reading progress"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={progressPercent}
                          className="mt-3 h-2 max-w-md overflow-hidden rounded-full bg-slate-100"
                        >
                          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progressPercent}%` }} />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">
                      {historyError || (loading ? 'Checking your reading history…' : 'Open a saved document to start tracking your reading progress.')}
                    </p>
                  )}
                  {historyError && lastOpened && <p role="status" className="mt-2 text-xs text-amber-700">{historyError}</p>}
                </div>
                <button
                  type="button"
                  disabled={!lastOpened}
                  onClick={() => lastOpened && openFile(lastOpened.file)}
                  className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Resume file ↗
                </button>
              </div>
            </section>

            <section aria-label="Focus timer" className="flex flex-col justify-between gap-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 sm:flex-row sm:items-center sm:p-6">
              <div>
                <p className="text-sm font-semibold text-indigo-700">Focus session</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Study for 25 minutes, then take a break.</h2>
                <p aria-live="polite" className="mt-1 text-sm text-slate-600">
                  {focusSeconds === 0 ? 'Focus session complete. Take a short break.' : focusRunning ? 'You’re in a focus session.' : 'Start a session whenever you’re ready.'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span aria-label={`${focusTime} remaining`} className="font-mono text-2xl font-bold tabular-nums text-indigo-900">
                  {focusTime}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (focusSeconds === 0) {
                      setFocusSeconds(FOCUS_DURATION_SECONDS)
                      setFocusRunning(true)
                    } else {
                      setFocusRunning((running) => !running)
                    }
                  }}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  {focusSeconds === 0 ? 'Start again' : focusRunning ? 'Pause' : focusSeconds === FOCUS_DURATION_SECONDS ? 'Start' : 'Resume'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFocusRunning(false)
                    setFocusSeconds(FOCUS_DURATION_SECONDS)
                  }}
                  className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  Reset
                </button>
              </div>
            </section>

            {dashboardPreferences.showSubjects && (
              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Your subjects</h2>
                    <p className="mt-1 text-sm text-slate-500">Open a subject to view its units and materials.</p>
                  </div>
                  <button type="button" onClick={() => navigate('/subjects')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                    All subjects →
                  </button>
                </div>

                {loading ? (
                  <p className="py-10 text-center text-sm text-slate-500">Loading subjects…</p>
                ) : matchingSubjects.length ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {matchingSubjects.slice(0, 6).map((subject) => {
                      const subjectFiles = files.filter((file) => file.subject === subject.name)
                      return (
                        <button
                          key={subject.id || `${subject.semester}-${subject.name}`}
                          type="button"
                          onClick={() => navigate(`/subjects/${encodeURIComponent(subject.name)}`)}
                          className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span className="font-semibold text-slate-900">{subject.name}</span>
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                              {subject.semester || 'Semester not set'}
                            </span>
                          </span>
                          <span className="mt-3 block text-sm text-slate-500">
                            {subject.units?.length || 0} units · {subjectFiles.length} {subjectFiles.length === 1 ? 'file' : 'files'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
                    <p className="font-semibold text-slate-800">{query ? 'No matching subjects' : 'No subjects yet'}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {query ? 'Try another search, or browse all subjects.' : 'Create a subject to organize units and upload your study files.'}
                    </p>
                    <button type="button" onClick={() => navigate('/subjects')} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                      Go to subjects
                    </button>
                  </div>
                )}
              </section>
            )}

            {dashboardPreferences.showRecentFiles && (
              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Recently added files</h2>
                    <p className="mt-1 text-sm text-slate-500">Open a file in its local viewer.</p>
                  </div>
                  <button type="button" onClick={() => navigate('/subjects')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                    Find files →
                  </button>
                </div>

                {loading ? (
                  <p className="py-10 text-center text-sm text-slate-500">Loading saved files…</p>
                ) : recentFiles.length ? (
                  <div className="mt-4 divide-y divide-slate-100">
                    {recentFiles.map((file) => (
                      <button
                        key={file.id || file.lid}
                        type="button"
                        onClick={() => openFile(file)}
                        className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-slate-50"
                      >
                        <span className="flex h-10 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[10px] font-bold text-indigo-700">
                          {getFileType(file)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800">{file.name}</span>
                          <span className="mt-1 block truncate text-xs text-slate-500">
                            {[file.subject, file.unit && `Unit ${file.unit}`, file.semester].filter(Boolean).join(' · ') || 'Saved in your local vault'}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{formatBytes(file.size || file.file?.size)}</span>
                        <span aria-hidden="true" className="text-slate-400">↗</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
                    <p className="font-semibold text-slate-800">{query ? 'No matching files' : 'No files saved yet'}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {query ? 'Try a different search term.' : 'Open a subject and unit to add your first study material.'}
                    </p>
                    {!query && (
                      <button type="button" onClick={() => navigate('/subjects')} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                        Browse subjects
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}

            <footer className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
              <button type="button" onClick={() => navigate('/storage')} className="text-sm font-semibold text-slate-600 hover:text-indigo-700">
                Storage &amp; settings
              </button>
              <button type="button" onClick={() => navigate('/subjects')} className="text-sm font-semibold text-slate-600 hover:text-indigo-700">
                Choose a subject to add material
              </button>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Home
