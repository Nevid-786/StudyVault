import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import SideBar from '../components/SideBar'
import TopBar from '../components/TopBar'
import {
  createAiReply,
  getStudyIndex,
  indexStudyMaterials,
  retrieveStudyContext,
} from '../features/revision/studyMaterialService.js'
import './Revision.css'

const ReactMarkdown = lazy(() => import('react-markdown'))

const initialMessages = {
  study: [{
    role: 'model',
    text: 'Ask a question about your study materials. I’ll search your indexed files and cite the relevant sources.',
    welcome: true,
  }],
  general: [{
    role: 'model',
    text: 'Ask me to explain a concept, make a study plan, or help you prepare for an exam.',
    welcome: true,
  }],
}

const getErrorMessage = (error) => (
  error.response?.data?.message || error.message || 'Something went wrong. Please try again.'
)

const getSourceGroups = (chunks) => {
  const groups = new Map()
  chunks.forEach((chunk, index) => {
    const key = JSON.stringify([chunk.title, chunk.source, chunk.location])
    const group = groups.get(key)
    if (group) {
      group.ids.push(`S${index + 1}`)
    } else {
      groups.set(key, {
        ids: [`S${index + 1}`],
        title: chunk.title,
        source: chunk.source,
        location: chunk.location,
      })
    }
  })
  return [...groups.values()]
}

const Revision = () => {
  const user = useSelector((state) => state.auth.user)
  const accessToken = useSelector((state) => state.auth.googleAccessToken)
  const folderId = useSelector((state) => state.auth.folderId)
  const userId = user?.sub
  const [mode, setMode] = useState('study')
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState('')
  const [indexInfo, setIndexInfo] = useState({ chunkCount: 0, documentCount: 0 })
  const [indexOwner, setIndexOwner] = useState(null)
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexProgress, setIndexProgress] = useState(null)
  const [indexNotice, setIndexNotice] = useState('')
  const [indexError, setIndexError] = useState('')
  const [indexSkipped, setIndexSkipped] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState('')
  const messagesEndRef = useRef(null)
  const visibleMessages = messages[mode]
  const isLoadingIndex = Boolean(userId && indexOwner !== userId)
  const visibleIndexInfo = indexOwner === userId ? indexInfo : { chunkCount: 0, documentCount: 0 }

  useEffect(() => {
    let isCurrent = true
    if (!userId) return () => { isCurrent = false }

    getStudyIndex(userId)
      .then((chunks) => {
        if (!isCurrent) return
        setIndexInfo({
          chunkCount: chunks.length,
          documentCount: new Set(chunks.map((chunk) => chunk.documentId)).size,
        })
        setIndexOwner(userId)
      })
      .catch((error) => {
        if (!isCurrent) return
        setIndexInfo({ chunkCount: 0, documentCount: 0 })
        setIndexOwner(userId)
        setIndexError(getErrorMessage(error))
      })

    return () => { isCurrent = false }
  }, [userId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [visibleMessages, isSending])

  const handleIndexMaterials = async () => {
    setIndexError('')
    setIndexNotice('')
    setIndexSkipped([])
    setIsIndexing(true)
    setIndexProgress(null)

    try {
      const result = await indexStudyMaterials({
        userId,
        accessToken,
        folderId,
        onProgress: setIndexProgress,
      })
      setIndexInfo({
        chunkCount: result.chunkCount,
        documentCount: result.documentsIndexed,
      })
      setIndexOwner(userId)
      setIndexSkipped(result.skipped)
      const skippedMessage = result.skipped.length
        ? ` ${result.skipped.length} file${result.skipped.length === 1 ? '' : 's'} skipped; review the details below.`
        : ''
      setIndexNotice(`Indexed ${result.documentsIndexed} file${result.documentsIndexed === 1 ? '' : 's'} into ${result.chunkCount} searchable passages.${skippedMessage}`)
      setIndexProgress(null)
    } catch (error) {
      setIndexError(getErrorMessage(error))
      setIndexProgress(null)
    } finally {
      setIsIndexing(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const question = draft.trim()
    if (!question || isSending) return

    setDraft('')
    setChatError('')
    const previousMessages = messages[mode]
    setMessages((current) => ({
      ...current,
      [mode]: [...current[mode], { role: 'user', text: question }],
    }))
    setIsSending(true)

    try {
      const matchedChunks = mode === 'study'
        ? await retrieveStudyContext(userId, question)
        : []
      const context = matchedChunks.map((chunk, index) => ({
        id: `S${index + 1}`,
        title: chunk.title,
        text: `${chunk.location ? `${chunk.location}\n` : ''}${chunk.text}`,
      }))
      const answer = await createAiReply({
        mode,
        question,
        history: previousMessages
          .filter((message) => !message.welcome)
          .slice(-10)
          .map(({ role, text }) => ({ role: role === 'user' ? 'user' : 'model', text })),
        context,
      })
      const sources = getSourceGroups(matchedChunks)
      setMessages((current) => ({
        ...current,
        [mode]: [...current[mode], { role: 'model', text: answer, sources }],
      }))
    } catch (error) {
      setChatError(getErrorMessage(error))
    } finally {
      setIsSending(false)
    }
  }

  const handleClearChat = () => {
    setMessages((current) => ({
      ...current,
      [mode]: [initialMessages[mode][0]],
    }))
    setChatError('')
  }

  return (
    <div className="app-shell">
      <SideBar />
      <div className="main-content">
        <TopBar islogged={Boolean(user)} user={user} />
        <main className="page-scroll revision-scroll">
          <div className="revision-page">
            <header className="revision-heading">
              <div>
                <span className="revision-eyebrow">PERSONALIZED STUDY ASSISTANT</span>
                <h1>Revision / Exam Mode</h1>
                <p>Ask questions from your notes or chat with Gemini about any topic.</p>
              </div>
              <div className="revision-index-summary" aria-live="polite">
                <span className="revision-status-dot" />
                {isLoadingIndex
                  ? 'Checking local index…'
                  : `${visibleIndexInfo.documentCount} files · ${visibleIndexInfo.chunkCount} passages indexed`}
              </div>
            </header>

            <section className="revision-workspace">
              <div className="revision-controls">
                <div className="revision-mode-switch" role="tablist" aria-label="Chat mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'study'}
                    className={mode === 'study' ? 'active' : ''}
                    onClick={() => setMode('study')}
                  >
                    Study materials
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'general'}
                    className={mode === 'general' ? 'active' : ''}
                    onClick={() => setMode('general')}
                  >
                    General chat
                  </button>
                </div>

                <button
                  className="revision-index-button"
                  type="button"
                  onClick={handleIndexMaterials}
                  disabled={isIndexing || !userId}
                >
                  {isIndexing ? 'Indexing materials…' : 'Build / refresh index'}
                </button>
              </div>

              {mode === 'study' && (
                <div className="revision-index-note">
                  <strong>Study mode</strong>
                  <span>
                    Files are read in your browser. Extracted text is sent to Gemini for embeddings;
                    the searchable index stays in this browser.
                  </span>
                  {indexProgress && (
                    <span className="revision-progress">
                      Processing {indexProgress.current}/{indexProgress.total}: {indexProgress.name}
                    </span>
                  )}
                  {isIndexing && !indexProgress && (
                    <span className="revision-progress">Reading saved study materials…</span>
                  )}
                  {indexNotice && <span className="revision-success" role="status">{indexNotice}</span>}
                  {indexError && <span className="revision-error" role="alert">{indexError}</span>}
                </div>
              )}

              {!userId && (
                <p className="revision-error" role="alert">Sign in with Google before using the AI assistant.</p>
              )}

              <div className="revision-chat">
                <div className="revision-chat-header">
                  <div>
                    <strong>{mode === 'study' ? 'Study materials assistant' : 'General study chat'}</strong>
                    <span>
                      {mode === 'study'
                        ? 'Answers use indexed sources and include citations.'
                        : 'Ask anything; this mode is not restricted to your files.'}
                    </span>
                  </div>
                  <button type="button" className="revision-clear-button" onClick={handleClearChat}>
                    Clear chat
                  </button>
                </div>

                <div className="revision-messages" aria-live="polite">
                  {visibleMessages.map((message, index) => (
                    <article
                      className={`revision-message ${message.role === 'user' ? 'from-user' : 'from-assistant'}`}
                      key={`${mode}-${index}`}
                    >
                      <span className="revision-message-avatar">{message.role === 'user' ? 'You' : 'AI'}</span>
                      <div className="revision-message-body">
                        <div className="revision-message-text">
                          <Suspense fallback={<span>Formatting answer…</span>}>
                            <ReactMarkdown>{message.text}</ReactMarkdown>
                          </Suspense>
                        </div>
                        {message.sources?.length > 0 && (
                          <div className="revision-citations">
                            <strong>Retrieved sources</strong>
                            {message.sources.map((source) => (
                              <span key={`${source.title}-${source.location}-${source.source}`}>
                                <b>{source.ids.map((id) => `[${id}]`).join(', ')}</b> {source.title}
                                {source.location ? ` · ${source.location}` : ''}
                                <small> · {source.source}</small>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                  {isSending && (
                    <div className="revision-typing" role="status">Gemini is preparing a reply…</div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {chatError && <p className="revision-error revision-chat-error" role="alert">{chatError}</p>}

                <form className="revision-composer" onSubmit={handleSubmit}>
                  <textarea
                    aria-label="Ask StudyVault"
                    placeholder={mode === 'study'
                      ? 'Ask about a concept in your indexed notes…'
                      : 'Ask Gemini anything…'}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        event.currentTarget.form?.requestSubmit()
                      }
                    }}
                    maxLength={2000}
                    rows={2}
                    disabled={isSending || !userId}
                  />
                  <button type="submit" disabled={isSending || !draft.trim() || !userId}>
                    {isSending ? 'Sending…' : 'Send'}
                  </button>
                </form>
                <p className="revision-composer-hint">Enter to send · Shift + Enter for a new line</p>
              </div>

              {indexNotice && indexError === '' && (
                <details className="revision-index-details">
                  <summary>Index status and supported formats</summary>
                  <p>PDF, DOCX, PPTX, TXT, Markdown, CSV, and images (OCR). Legacy DOC/PPT files need conversion.</p>
                  {indexSkipped.length > 0 && (
                    <ul>
                      {indexSkipped.map((item) => (
                        <li key={`${item.name}-${item.reason}`}>{item.name}: {item.reason}</li>
                      ))}
                    </ul>
                  )}
                </details>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Revision
