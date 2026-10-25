import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loadmanifest } from '../stores/fileSlice'
import SideBar from '../components/SideBar'
import TopBar from '../components/TopBar'
import subjectService from '../services/subjectService'

/* ─── Mock Data ─────────────────────────────────────────── */
const exams = [
  { id: 1, subject: 'Applied Thermodynamics', code: 'PHY-204', venue: 'Midterm Hall B • Paper 1', date: 'May 24', daysLeft: 12, color: '#FEF3C7', iconColor: '#D97706', icon: '⚗️' },
  { id: 2, subject: 'Computer Architecture',  code: 'CS-310',  venue: 'Lab Building 3 • Terminal Exam', date: 'May 27', daysLeft: 15, color: '#EEF2FF', iconColor: '#4F46E5', icon: '💻' },
]

const subjects = [
  { id: 1, name: 'Physics',              files: 48, extra: '3 decks',        progress: 74, color: '#4F46E5', iconBg: '#EEF2FF', icon: '⚗️' },
  { id: 2, name: 'Chemistry',            files: 32, extra: 'Organic notes',  progress: 58, color: '#14B8A6', iconBg: '#CCFBF1', icon: '🧪' },
  { id: 3, name: 'Computer Architecture',files: 26, extra: 'RISC-V labs',    progress: 82, color: '#6366F1', iconBg: '#EEF2FF', icon: '🖥️' },
  { id: 4, name: 'Calculus',             files: 41, extra: 'Multivariable',  progress: 45, color: '#EF4444', iconBg: '#FEE2E2', icon: '∑'  },
]

const recentFiles = [
  { id: 1, title: 'Stokes Theorem …',   time: '25 mins ago',     from: 'From: Physics Group',   type: 'PDF',   color: '#EF4444', bg: '#FEE2E2' },
  { id: 2, title: 'CPU Pipelining & …', time: 'Today, 9:15 AM',  from: 'From: Prof. Verma',     type: 'PPT',   color: '#F97316', bg: '#FFEDD5' },
  { id: 3, title: 'Electrophilic Sub…', time: 'Yesterday, 4:20 PM', from: 'From: WhatsApp Web', type: 'Image', color: '#10B981', bg: '#D1FAE5' },
  { id: 4, title: 'NIST Thermodynam…',  time: 'Yesterday, 11:00 AM', from: 'From: Chemistry TA',type: 'Web',   color: '#3B82F6', bg: '#DBEAFE' },
  { id: 5, title: 'Eigenvalues & Di…',  time: 'May 10',          from: 'From: Study Circle',    type: 'PDF',   color: '#EF4444', bg: '#FEE2E2' },
]

/* ─── Sub-components ─────────────────────────────────────── */

function ExamCard({ exam }) {
  return (
    <div className="exam-card">
      <div className="exam-icon" style={{ background: exam.color, color: exam.iconColor }}>
        {exam.icon}
      </div>
      <div className="exam-info">
        <div className="exam-subject">
          {exam.subject} <span className="exam-code">{exam.code}</span>
        </div>
        <div className="exam-venue">{exam.venue}</div>
      </div>
      <div className="exam-date-block">
        <div className="exam-date">{exam.date}</div>
        <div className="exam-days-pill">{exam.daysLeft} days left</div>
      </div>
    </div>
  )
}

function CurrentlyReading() {
  return (
    <div className="reading-card">
      <div className="reading-badge-row">
        <span className="subject-pill">Physics</span>
        <span className="reading-time">🕐 Last active 18m ago</span>
        <span className="reading-progress-pill">62% Completed</span>
      </div>

      <div className="reading-body">
        <div className="reading-thumbnail">
          <div className="reading-thumbnail-inner">
            <div className="pdf-badge">PDF</div>
            <div className="reading-thumb-content">
              <div className="reading-thumb-lines">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="thumb-line" style={{ width: `${60 + (i * 7) % 30}%`, opacity: 0.4 + i * 0.05 }} />
                ))}
              </div>
            </div>
            <div className="reading-thumb-caption">
              <div className="thumb-caption-title">Carnot Efficiency Eq.</div>
              <div className="thumb-caption-sub">Section 3.4</div>
            </div>
          </div>
        </div>

        <div className="reading-details">
          <h2 className="reading-title">Thermodynamics Ch.3 – Heat Engines &amp; Entropy</h2>
          <p className="reading-desc">Covers second law derivations, Clausius theorem, reversible cycles, and closed engine efficiency…</p>

          <div className="reading-progress-row">
            <span>Page 42 of 68</span>
            <span>26 pages remaining</span>
          </div>
          <div className="reading-bar-track">
            <div className="reading-bar-fill" style={{ width: '62%' }} />
          </div>

          <div className="reading-actions">
            <button className="btn-primary">▶ Resume Reading</button>
            <button className="btn-ghost">🔖 Notes</button>
            <button className="btn-ghost btn-icon">•••</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StorageSync() {
  return (
    <div className="storage-card">
      <div className="storage-header">
        <div className="storage-title-row">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          <span className="storage-title">Storage &amp; Sync</span>
        </div>
        <span className="storage-check">✓</span>
      </div>
      <div className="storage-sub">Multi-tier redundancy</div>

      <div className="storage-item">
        <div className="storage-item-row">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          <span className="storage-device">This device</span>
          <span className="storage-amount">340 MB / 5 GB</span>
        </div>
        <div className="storage-track">
          <div className="storage-fill storage-fill-green" style={{ width: '6.8%' }} />
        </div>
        <div className="storage-note">4.66 GB free locally</div>
      </div>

      <div className="storage-item">
        <div className="storage-item-row">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          <span className="storage-device">Google Drive</span>
          <span className="storage-amount">1.2 GB synced</span>
        </div>
        <div className="storage-track">
          <div className="storage-fill storage-fill-primary" style={{ width: '48%' }} />
        </div>
        <div className="storage-note-row">
          <span className="storage-live-pill">Auto-backup live</span>
          <span className="storage-note">Synced 2 min ago</span>
        </div>
      </div>

      <button className="storage-manage-btn">Manage cloud quotas →</button>
    </div>
  )
}

function SubjectCard({ subject }) {
  const circumference = 2 * Math.PI * 18
  const dash = (subject.progress / 100) * circumference

  return (
    <div className="subject-card">
      <div className="subject-card-top">
        <div className="subject-icon-wrap" style={{ background: subject.iconBg }}>
          <span style={{ fontSize: '20px' }}>{subject.icon}</span>
        </div>
        <svg width="40" height="40" viewBox="0 0 44 44" className="subject-ring">
          <circle cx="22" cy="22" r="18" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle
            cx="22" cy="22" r="18" fill="none"
            stroke={subject.color} strokeWidth="3"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 22 22)"
          />
          <text x="22" y="26" textAnchor="middle" fontSize="9" fill={subject.color} fontWeight="700">{subject.progress}%</text>
        </svg>
      </div>
      <div className="subject-name">{subject.name}</div>
      <div className="subject-meta">{subject.files} files • {subject.extra}</div>
      <div className="subject-bar-track">
        <div className="subject-bar-fill" style={{ width: `${subject.progress}%`, background: subject.color }} />
      </div>
    </div>
  )
}

function RecentFileCard({ file }) {
  return (
    <div className="recent-card">
      <div className="recent-thumb" style={{ background: file.bg }}>
        <span className="recent-file-badge" style={{ background: file.color }}>{file.type}</span>
        <div className="recent-thumb-pattern">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="recent-thumb-line" />
          ))}
        </div>
      </div>
      <div className="recent-info">
        <div className="recent-title">{file.title}</div>
        <div className="recent-time">{file.time}</div>
        <div className="recent-from">{file.from}</div>
      </div>
    </div>
  )
}

/* ─── Main Home Page ────────────────────────────────────── */
const Home = () => {
  const dispatch = useDispatch();
  const user= useSelector((state)=> state.auth.user);
  const [isLogged, setIsLogged] = useState(false);


  useEffect(() => {
    dispatch(loadmanifest())
      console.log("Home component",user);
      if(user){
        setIsLogged(true);
        console.log("user found :Home");
      }
subjectService.getAllSubjects().then((subjects) => {
  console.log("Subjects fetched:", subjects);
}).catch((error) => {
  console.error("Error fetching subjects:", error);
});
  }, [dispatch,user])

  return (
    <div className="app-shell">
      <SideBar />

      <div className="main-content">
        <TopBar  islogged={isLogged} user={user}/>

        <div className="page-scroll">
          {/* Page header */}
          <div className="page-header">
            <div>
              <div className="page-breadcrumb">● SEMESTER 4 • ACADEMIC WORKSPACE</div>
              <h1 className="page-greeting">Good morning, Aman</h1>
              <p className="page-subtitle">
                You have <span className="highlight-pill">2 exams coming up</span> in 12 days. Focus on Thermodynamics today.
              </p>
            </div>
            <div className="page-header-search">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span>Search notes, highlights, subjects…</span>
              <div className="header-search-right">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                <kbd>⌘K</kbd>
              </div>
            </div>
          </div>

          {/* Exam cards */}
          <div className="exam-row">
            {exams.map((exam) => <ExamCard key={exam.id} exam={exam} />)}
          </div>

          {/* Reading + Storage */}
          <div className="mid-section">
            <CurrentlyReading />
            <StorageSync />
          </div>

          {/* Enrolled Subjects */}
          <section className="section">
            <div className="section-header">
              <div className="section-title-row">
                <h2 className="section-title">Enrolled Subjects</h2>
                <span className="count-pill">4 Active</span>
              </div>
              <button className="view-all-btn">View all folders ›</button>
            </div>
            <div className="subjects-grid">
              {subjects.map((s) => <SubjectCard key={s.id} subject={s} />)}
            </div>
          </section>

          {/* Recently Added */}
          <section className="section">
            <div className="section-header">
              <div className="section-title-row">
                <h2 className="section-title">Recently Added</h2>
                <span className="count-pill">Latest 5</span>
              </div>
              <div className="section-arrows">
                <button className="arrow-btn">‹</button>
                <button className="arrow-btn">›</button>
              </div>
            </div>
            <div className="recent-grid">
              {recentFiles.map((f) => <RecentFileCard key={f.id} file={f} />)}
            </div>
          </section>
        </div>
      </div>

      {/* FAB */}
      <button className="fab">+</button>
    </div>
  )
}

export default Home