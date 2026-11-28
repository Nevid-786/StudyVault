import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import SideBar from '../components/SideBar'
import TopBar from '../components/TopBar'
import localDB from '../config/indexdb'
import { loadmanifest } from '../stores/fileSlice'
import { getViewerPath } from '../utils/fileViewer'

const FILE_FILTERS = [
  { id: 'all', label: 'All materials' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'documents', label: 'Documents' },
  { id: 'presentations', label: 'Presentations' },
  { id: 'images', label: 'Images' },
  { id: 'other', label: 'Other' },
]

const CATEGORY_STYLES = {
  pdf: 'bg-rose-50 text-rose-700 ring-rose-100',
  documents: 'bg-blue-50 text-blue-700 ring-blue-100',
  presentations: 'bg-amber-50 text-amber-700 ring-amber-100',
  images: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  other: 'bg-slate-100 text-slate-700 ring-slate-200',
}

const getFileCategory = (file) => {
  const type = (file.type || file.file?.type || '').toLowerCase()
  const extension = file.name?.split('.').pop()?.toLowerCase()

  if (type === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
    return 'images'
  }
  if (
    type.includes('presentation')
    || type === 'application/vnd.ms-powerpoint'
    || ['ppt', 'pptx'].includes(extension)
  ) {
    return 'presentations'
  }
  if (
    type.includes('word')
    || type.startsWith('text/')
    || ['doc', 'docx', 'md', 'markdown', 'csv', 'rtf'].includes(extension)
  ) {
    return 'documents'
  }
  return 'other'
}

const getFileTypeLabel = (file) => {
  const extension = file.name?.split('.').pop()
  if (extension && extension !== file.name) return extension.toUpperCase()
  return file.type?.split('/').pop()?.toUpperCase() || 'FILE'
}

const getFileLocation = (file) => (
  [file.semester, file.subject, file.unit].filter(Boolean).join(' / ')
)

const getFileSize = (file) => Number(file.size) || file.file?.size || 0

const formatBytes = (value) => {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const Library = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const [files, setFiles] = useState([])
  const [lastOpened, setLastOpened] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [actionError, setActionError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [view, setView] = useState('grid')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    const loadLibrary = async () => {
      setLoading(true)
      setError('')
      setHistoryError('')

      try {
        dispatch(loadmanifest())
        const rows = await localDB.getallfile()
        if (!Array.isArray(rows)) throw new TypeError('The local vault returned invalid library data.')
        if (active) setFiles(rows)
      } catch (loadError) {
        console.error('Unable to load the StudyVault library:', loadError)
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load your library.')
      }

      try {
        const recent = await localDB.getLastOpenedFile()
        if (active) setLastOpened(recent)
      } catch (loadError) {
        console.error('Unable to load library reading history:', loadError)
        if (active) setHistoryError('Reading history is unavailable; your saved materials are still accessible.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadLibrary()
    return () => { active = false }
  }, [dispatch, reloadKey])

  useEffect(() => {
    const refreshOnFocus = () => setReloadKey((current) => current + 1)
    window.addEventListener('focus', refreshOnFocus)
    return () => window.removeEventListener('focus', refreshOnFocus)
  }, [])

  const subjects = useMemo(
    () => [...new Set(files.map((file) => file.subject).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
    [files],
  )

  const filterCounts = useMemo(() => {
    const counts = { all: files.length }
    FILE_FILTERS.slice(1).forEach(({ id }) => { counts[id] = 0 })
    files.forEach((file) => { counts[getFileCategory(file)] += 1 })
    return counts
  }, [files])

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matchingFiles = files.filter((file) => {
      const fileCategory = getFileCategory(file)
      const location = getFileLocation(file)
      const matchesCategory = category === 'all' || fileCategory === category
      const matchesSubject = subjectFilter === 'all' || file.subject === subjectFilter
      const matchesSearch = !query || [file.name, location, file.type]
        .some((value) => String(value || '').toLowerCase().includes(query))
      return matchesCategory && matchesSubject && matchesSearch
    })

    return matchingFiles.sort((left, right) => {
      if (sortBy === 'name') return (left.name || '').localeCompare(right.name || '')
      if (sortBy === 'size') return getFileSize(right) - getFileSize(left)
      return (Number(right.id) || 0) - (Number(left.id) || 0)
    })
  }, [category, files, search, sortBy, subjectFilter])

  const totalBytes = files.reduce((total, file) => total + getFileSize(file), 0)
  const resumePage = Number(lastOpened?.progress?.pageNumber)
  const resumePageCount = Number(lastOpened?.progress?.pageCount)
  const resumePercent = resumePageCount > 0
    ? Math.min(100, Math.round((resumePage / resumePageCount) * 100))
    : null

  const openFile = (file) => {
    setActionError('')
    const viewerPath = getViewerPath(file)
    if (viewerPath) {
      window.open(viewerPath, '_blank', 'noopener,noreferrer')
      return
    }

    if (file.file instanceof Blob) {
      const objectUrl = URL.createObjectURL(file.file)
      window.open(objectUrl, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
      return
    }

    setActionError('This material has no supported local preview.')
  }

  const clearFilters = () => {
    setSearch('')
    setCategory('all')
    setSubjectFilter('all')
  }

  return (
    <div className="app-shell">
      <SideBar />
      <div className="main-content">
        <TopBar islogged={Boolean(user)} user={user} />
        <main className="page-scroll !gap-6 !px-4 !py-6 sm:!px-6 lg:!px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Your study space</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Library</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Find, organize, and pick up where you left off with materials saved on this device.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/add')}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <span aria-hidden="true" className="text-lg leading-none">+</span>
                Add materials
              </button>
            </header>

            {error && (
              <div role="alert" className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setReloadKey((current) => current + 1)}
                  className="shrink-0 font-semibold underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            )}

            <section aria-label="Library summary" className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Materials', value: files.length, detail: 'Saved on this device', color: 'text-indigo-700', icon: 'M6 3h9l5 5v13H6z M14 3v6h6 M9 13h8 M9 17h8' },
                { label: 'Subjects', value: subjects.length, detail: 'With saved materials', color: 'text-emerald-700', icon: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z M4 17.5A2.5 2.5 0 0 1 6.5 15H20' },
                { label: 'Storage used', value: formatBytes(totalBytes), detail: 'Local file data', color: 'text-violet-700', icon: 'M4 7h16v13H4z M4 7l2-4h12l2 4 M9 12h6' },
              ].map((stat) => (
                <article key={stat.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 ${stat.color}`}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d={stat.icon} />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                    <p className="mt-0.5 truncate text-xl font-bold text-slate-900">{loading ? '...' : stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.detail}</p>
                  </div>
                </article>
              ))}
            </section>

            {lastOpened && (
              <section aria-label="Continue reading" className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Continue reading</p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-slate-900" title={lastOpened.file.name}>
                    {lastOpened.file.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {resumePageCount > 0
                      ? `Page ${resumePage} of ${resumePageCount} · ${resumePercent}% complete`
                      : getFileLocation(lastOpened.file) || 'Recently opened'}
                  </p>
                  {resumePercent !== null && (
                    <div
                      role="progressbar"
                      aria-label="Reading progress"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={resumePercent}
                      className="mt-3 h-2 max-w-md overflow-hidden rounded-full bg-indigo-100"
                    >
                      <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${resumePercent}%` }} />
                    </div>
                  )}
                  {historyError && <p role="status" className="mt-2 text-xs text-amber-700">{historyError}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => openFile(lastOpened.file)}
                  className="min-h-11 shrink-0 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Resume material
                </button>
              </section>
            )}

            <section aria-label="Browse library" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_190px_190px_auto]">
                <label className="relative block">
                  <span className="sr-only">Search library</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, subject, or unit"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label>
                  <span className="sr-only">Filter by subject</span>
                  <select
                    value={subjectFilter}
                    onChange={(event) => setSubjectFilter(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="all">All subjects</option>
                    {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Sort materials</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="recent">Recently added</option>
                    <option value="name">Name: A to Z</option>
                    <option value="size">Largest file</option>
                  </select>
                </label>
                <div className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Library layout">
                  {['grid', 'list'].map((layout) => (
                    <button
                      key={layout}
                      type="button"
                      aria-label={`${layout === 'grid' ? 'Grid' : 'List'} view`}
                      aria-pressed={view === layout}
                      onClick={() => setView(layout)}
                      className={`h-full rounded-lg px-3 text-xs font-semibold capitalize transition ${view === layout ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {layout}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter by file type">
                {FILE_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    role="tab"
                    aria-selected={category === filter.id}
                    onClick={() => setCategory(filter.id)}
                    className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${category === filter.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {filter.label} <span className={category === filter.id ? 'text-indigo-100' : 'text-slate-400'}>{filterCounts[filter.id] || 0}</span>
                  </button>
                ))}
              </div>
            </section>

            {actionError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{actionError}</p>}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">
                {loading
                  ? 'Loading your materials...'
                  : error
                    ? 'Library unavailable'
                    : `${filteredFiles.length} ${filteredFiles.length === 1 ? 'material' : 'materials'}${search ? ` matching "${search.trim()}"` : ''}`}
              </p>
              {(search || category !== 'all' || subjectFilter !== 'all') && (
                <button type="button" onClick={clearFilters} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">
                  Clear filters
                </button>
              )}
            </div>

            {loading ? (
              <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="h-10 w-10 rounded-xl bg-slate-100" />
                    <div className="mt-5 h-4 w-2/3 rounded bg-slate-100" />
                    <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : error ? null : files.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7">
                    <path d="M6 3h9l5 5v13H6z M14 3v6h6 M9 13h8 M9 17h5" />
                  </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-900">Your library is ready for its first material</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Add notes, readings, and lecture files to your subjects to find them here and study from one place.
                </p>
                <button type="button" onClick={() => navigate('/add')} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">
                  Add your first material
                </button>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
                <h2 className="text-base font-semibold text-slate-900">No materials match these filters</h2>
                <p className="mt-2 text-sm text-slate-500">Try another search or clear the selected filters.</p>
                <button type="button" onClick={clearFilters} className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                  Clear filters
                </button>
              </div>
            ) : (
              <section
                aria-label="Saved materials"
                className={`grid gap-4 ${view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}
              >
                {filteredFiles.map((file) => {
                  const fileCategory = getFileCategory(file)
                  const typeLabel = getFileTypeLabel(file)
                  const location = getFileLocation(file)
                  return (
                    <article
                      key={file.lid || file.id}
                      className={`group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md ${view === 'list' ? 'sm:flex sm:items-center sm:gap-5' : 'flex flex-col'}`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold tracking-wide ring-1 ${CATEGORY_STYLES[fileCategory]}`}>
                          {typeLabel.length > 7 ? `${typeLabel.slice(0, 6)}…` : typeLabel}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${CATEGORY_STYLES[fileCategory]}`}>
                              {FILE_FILTERS.find((filter) => filter.id === fileCategory)?.label || 'Other'}
                            </span>
                            <span className="text-[11px] text-slate-400">On this device</span>
                          </div>
                          <h2 className="mt-2 truncate text-sm font-semibold text-slate-900" title={file.name || 'Untitled material'}>
                            {file.name || 'Untitled material'}
                          </h2>
                          <p className="mt-1 truncate text-xs text-slate-500" title={location}>
                            {location || 'No subject assigned'}
                          </p>
                          <p className="mt-3 text-xs text-slate-500">{formatBytes(getFileSize(file))}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openFile(file)}
                        className={`mt-4 min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 ${view === 'list' ? 'sm:mt-0 sm:shrink-0' : 'w-full'}`}
                      >
                        Open material
                      </button>
                    </article>
                  )
                })}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Library
