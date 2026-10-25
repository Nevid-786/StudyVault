import { useState,useEffect } from 'react'
import SideBar from '../components/SideBar'
import TopBar from '../components/TopBar'
import { useSelector } from 'react-redux'
import  SubjectService from '../services/subjectService'
import { useNavigate } from 'react-router-dom'
import AddUnit from '../components/AddUnit'


const fileTypeMeta = {
  PDF:   { color: '#EF4444', bg: '#FEE2E2' },
  PPT:   { color: '#F97316', bg: '#FFEDD5' },
  Image: { color: '#10B981', bg: '#D1FAE5' },
  Web:   { color: '#3B82F6', bg: '#DBEAFE' },
}

/* ── Sub-components ─────────────────────────────────────── */
function SubjectCard({ subject, onOpen }) {
  const navigate=useNavigate();


  return (
    <div className="subj-card flex flex-col justify-center items-center " onClick={() =>navigate(`/subjects/${subject.name}`)}>

    

      {/* Title */}
      <div className=" text-3xl ">{subject.name}</div>
      <div className="subj-card-code">{subject.semester}</div>

     
     

 

      {/* Open button */}
      <div className="rounded-sm bg-blue-600" style={{ padding: '8px 12px' }} >
        Open Subject →
      </div>
    </div>
  )
}

function AddSubjectCard({ onAdd }) {
  return (
    <div className="subj-card subj-add-card" onClick={onAdd}>
      <div className="subj-add-icon">+</div>
      <div className="subj-add-label">Add New Subject</div>
      <div className="subj-add-hint">Import files, link Google Drive folder or create manually</div>
    </div>
  )
}

function AddSubjectModal({ onClose }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [semester, setSemester] = useState('Semester 5')
  const handleCreate= async ()=>{
    console.log("create subject clicked",name,code,semester)
    try{
      // Call the service to add the subject
      await SubjectService.addSubject(semester,name);
      onClose(); // Close the modal after adding
    }
    catch(err){
      console.error("Error adding subject:", err);
    }

  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Subject</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Subject Name</label>
            <input className="form-input" placeholder="e.g. Applied Thermodynamics" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-row">
           
            <div className="form-group">
              <label className="form-label">Semester</label>
              <select className="form-input" value={semester} onChange={e => setSemester(e.target.value)}>
                {[1,2,3,4,5,6,7].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Choose Icon</label>
            <div className="icon-grid">
              {['⚗️','🧪','🖥️','∑','🌳','⚙️','📐','🔬','🧮','📊'].map(ic => (
                <button key={ic} className="icon-pick-btn">{ic}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate}>Create Subject</button>
        </div>
      </div>
    </div>
  )
}

/* ── Subjects Page ──────────────────────────────────────── */
const Subjects = () => {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const user= useSelector((state)=> state.auth.user);
  const [allSubjects, setAllSubjects] = useState([]);
  const [subjectsError, setSubjectsError] = useState(null)
  const [islogged,setIslogged]=useState(false);

  const getSubjects=async()=>{
    try{
      const subjects= await SubjectService.getAllSubjects();
      if (!Array.isArray(subjects)) {
        throw new TypeError('Subject storage returned an invalid result')
      }
      console.log("Subjects fetched:", subjects);
      setAllSubjects(subjects);
      setSubjectsError(null)
    }
    catch(err){
      console.error("Error fetching subjects:", err);
      setSubjectsError(err instanceof Error ? err.message : 'Unable to load subjects')
    }
  }
  useEffect(()=>{
    getSubjects();
  },[])
  useEffect(()=>{
  
    if(user){
      setIslogged(true);
    }
  },[user])

  const filters = ['All', 'Semester 4', 'Semester 3']

  const filtered = allSubjects.filter(s => {
    const matchSearch = (s.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
                        (s.code ?? '').toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'All') return true

    return s.semester === filter
  })

  return (
    <div className="app-shell">
      <SideBar />

      <div className="main-content">
        <TopBar islogged={islogged} user={user} />

        <div className="page-scroll">
          {/* Page Header */}
          <div className="subjects-page-header">
            <div>
              <div className="page-breadcrumb">● SEMESTER 4 • ACADEMIC WORKSPACE</div>
              <h1 className="page-greeting">Enrolled Subjects</h1>
              <p className="page-subtitle">
                <span className="highlight-pill">{allSubjects.filter(s=>s.progress == null || s.progress < 100).length} Active</span>
                {' '}• {allSubjects.length} total subjects across {[...new Set(allSubjects.map(s=>s.semester))].length} semesters
              </p>
            </div>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              + Add Subject
            </button>
          </div>

          {/* Search + Filter bar */}
          <div className="subj-toolbar">
            <div className="subj-search">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                className="subj-search-input"
                placeholder="Search subjects…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="subj-filters">
              {filters.map(f => (
                <button
                  key={f}
                  className={`subj-filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Strip */}
          <div className="subj-stats-strip">
            {[
              { label: 'Total Files', value: allSubjects.reduce((a, s) => a + (Number(s.files) || 0), 0), icon: '📁' },
              { label: 'Active Subjects', value: allSubjects.filter(s => s.progress == null || s.progress < 100).length, icon: '📚' },
              { label: 'Avg Progress', value: (allSubjects.length ? Math.round(allSubjects.reduce((a, s) => a + (Number(s.progress) || 0), 0) / allSubjects.length) : 0) + '%', icon: '📈' },
              { label: 'Total Decks', value: allSubjects.reduce((a, s) => a + (Number(s.decks) || 0), 0), icon: '🃏' },
            ].map(stat => (
              <div key={stat.label} className="stat-strip-item">
                <span className="stat-strip-icon">{stat.icon}</span>
                <div>
                  <div className="stat-strip-val">{stat.value}</div>
                  <div className="stat-strip-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Subject grid */}
          <div className="subjects-grid-full">
            {filtered.map(s => (
              <SubjectCard key={s.id} subject={s} onOpen={setSelectedSubject} />
            ))}
            <AddSubjectCard onAdd={() => setShowAddModal(true)} />
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">{subjectsError ? '⚠️' : '🔍'}</div>
              <div className="empty-title">{subjectsError ? 'Unable to load subjects' : 'No subjects found'}</div>
              <div className="empty-sub">{subjectsError || 'Try adjusting your search or filter'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && <AddSubjectModal onClose={() => setShowAddModal(false)} />}

      <button className="fab" onClick={() => setShowAddModal(true)}>+</button>

    </div>
  )
}

export default Subjects
