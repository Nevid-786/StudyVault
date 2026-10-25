import React, { useEffect, useState } from 'react'
import SideBar from '../components/SideBar'
import TopBar from '../components/TopBar'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import SubjectService from '../services/subjectService'
import AddUnit from '../components/AddUnit'

const SingleSubject = () => {
  const { name } = useParams()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const [isLogged, setIsLogged] = useState(false)
  const [subject, setSubject] = useState(null)
  const [units, setUnits] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsLogged(Boolean(user))
  }, [user])

  useEffect(() => {
    let isCurrent = true

    const loadSubject = async () => {
      setLoading(true)
      try {
        const subjects = await SubjectService.getAllSubjects()
        if (!Array.isArray(subjects)) {
          throw new TypeError('Subject storage returned an invalid result')
        }

        const currentSubject = subjects.find(
          (item) => (item.name || '').toLowerCase() === (name || '').toLowerCase()
        )

        if (isCurrent) {
          setSubject(currentSubject || null)
          setUnits(Array.isArray(currentSubject?.units) ? currentSubject.units : [])
          setError(null)
        }
      } catch (err) {
        if (isCurrent) setError(err instanceof Error ? err.message : 'Unable to load units')
      } finally {
        if (isCurrent) setLoading(false)
      }
    }

    loadSubject()
    return () => { isCurrent = false }
  }, [name])

  const filteredUnits = units.filter((unit, index) => {
    const title = typeof unit === 'string' ? unit : unit.name || unit.title || `Unit ${index + 1}`
    return title.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="app-shell [&_.add-unit-modal]:fixed [&_.add-unit-modal]:inset-0 [&_.add-unit-modal]:z-[1000] [&_.add-unit-modal]:p-5 [&_.add-unit-modal]:bg-slate-900/60 [&_.add-unit-modal]:backdrop-blur-sm [&_.add-unit-modal_[role=dialog]]:w-[min(100%,28rem)] [&_.add-unit-modal_[role=dialog]]:p-7 [&_.add-unit-modal_[role=dialog]]:border [&_.add-unit-modal_[role=dialog]]:border-slate-200 [&_.add-unit-modal_[role=dialog]]:rounded-2xl [&_.add-unit-modal_[role=dialog]]:bg-white [&_.add-unit-modal_[role=dialog]]:text-slate-900 [&_.add-unit-modal_[role=dialog]]:shadow-[0_24px_70px_rgba(15,23,42,0.28)] [&_.add-unit-modal_form]:grid [&_.add-unit-modal_form]:gap-4 [&_.add-unit-modal_h2]:mb-1 [&_.add-unit-modal_h2]:text-[1.4rem] [&_.add-unit-modal_h2]:font-bold [&_.add-unit-modal_label]:grid [&_.add-unit-modal_label]:gap-[0.45rem] [&_.add-unit-modal_label]:text-sm [&_.add-unit-modal_label]:font-semibold [&_.add-unit-modal_input]:box-border [&_.add-unit-modal_input]:w-full [&_.add-unit-modal_input]:rounded-lg [&_.add-unit-modal_input]:border [&_.add-unit-modal_input]:border-slate-300 [&_.add-unit-modal_input]:px-3 [&_.add-unit-modal_input]:py-[0.7rem] [&_.add-unit-modal_button]:rounded-lg [&_.add-unit-modal_button]:border-0 [&_.add-unit-modal_button]:bg-blue-600 [&_.add-unit-modal_button]:px-4 [&_.add-unit-modal_button]:py-[0.7rem] [&_.add-unit-modal_button]:font-semibold [&_.add-unit-modal_button]:text-white [&_.add-unit-modal_button]:cursor-pointer [&_.add-unit-modal_button:hover]:brightness-95 [&_.add-unit-modal_button[type=button]]:bg-slate-100 [&_.add-unit-modal_button[type=button]]:text-slate-700">
      <SideBar />

      <div className="main-content">
        <TopBar islogged={isLogged} user={user} />

        <div className="page-scroll">
          <div className="subjects-page-header">
            <div>
              <div className="page-breadcrumb">● SUBJECT WORKSPACE</div>
              <h1 className="page-greeting">{subject?.name || name || 'Subject'}</h1>
              <p className="page-subtitle">
                <span className="highlight-pill">{units.length} Units</span>
                {subject?.semester && ` • ${subject.semester}`}
              </p>
            </div>
            <button className="btn-primary" onClick={() => setIsOpen(true)}>
              + Add Unit
            </button>
           
          </div>

          <div className="subj-toolbar">
            <div className="subj-search">
              <input
                className="subj-search-input"
                placeholder="Search units…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="empty-state"><div className="empty-title">Loading units…</div></div>
          ) : filteredUnits.length > 0 ? (
            <div className="subjects-grid-full">
              {filteredUnits.map((unit, index) => {
                const title = typeof unit === 'string' ? unit : unit.name || unit.title || `Unit ${index + 1}`
                const description = typeof unit === 'string' ? '' : unit.description
                return (
                  <div className="subj-card" key={unit.id || unit._id || `${title}-${index}`} onClick={() => {
                    const params = new URLSearchParams({
                      semester: subject?.semester || '',
                      subject: subject?.name || '',
                      unit: title,
                    })
                    navigate(`/unit?${params.toString()}`)
                  }}>
                    <div className="text-3xl">{title}</div>
                    {description && <div className="subj-card-code">{description}</div>}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">{error ? '⚠️' : '📚'}</div>
              <div className="empty-title">
                {error ? 'Unable to load units' : subject ? 'No units found' : 'Subject not found'}
              </div>
              <div className="empty-sub">
                {error || (search ? 'Try a different search' : 'No units are available for this subject yet.')}
              </div>
            </div>
          )}
        </div>
      </div>
            <AddUnit isOpen={isOpen} setIsOpen={setIsOpen} name={name} />
    </div>
  )
}

export default SingleSubject;