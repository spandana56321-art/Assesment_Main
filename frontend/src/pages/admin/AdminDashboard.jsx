import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import { api } from '../../services/api'
import QuestionForm from './QuestionForm'
import DomainForm from './DomainForm'
import './AdminDashboard.css'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function ResultsTab() {
  const { adminToken } = useAdmin()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [expandedId, setExpandedId] = useState(null)
  const [selectedExam, setSelectedExam] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [finishingId, setFinishingId] = useState(null)

  function refreshResults() {
    return api.admin
      .getExams(adminToken)
      .then((data) => setResults(data.exams))
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    setLoading(true)
    refreshResults().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken])

  async function handleForceFinish(exam) {
    if (
      !window.confirm(
        `Force-finish this candidate's exam?\n\nThis will score whatever they've answered so far and close it out. Use this only for exams stuck "in progress" because the candidate never returned.`
      )
    )
      return

    setFinishingId(exam._id)
    try {
      await api.admin.forceFinishExam(exam._id, adminToken)
      await refreshResults()
    } catch (err) {
      setError(err.message)
    } finally {
      setFinishingId(null)
    }
  }

  async function handleToggleDetails(examId) {
    // Collapse if this row is already open
    if (expandedId === examId) {
      setExpandedId(null)
      setSelectedExam(null)
      setDetailsError('')
      return
    }

    setExpandedId(examId)
    setSelectedExam(null)
    setDetailsError('')
    setDetailsLoading(true)
    try {
      const data = await api.admin.getExam(examId, adminToken)
      // Adjust this if your API wraps the exam differently, e.g. data.exam vs data
      setSelectedExam(data.exam || data)
    } catch (err) {
      setDetailsError(err.message)
    } finally {
      setDetailsLoading(false)
    }
  }

  if (loading) return <p className="loading-text">Loading results…</p>
  if (error) return <p className="form-error">{error}</p>
  if (!results.length) return <p className="empty-state">No candidates have submitted an assessment yet.</p>

  const avgPct = Math.round(
    (results.reduce((sum, r) => sum + (r.totalMarks ? r.score / r.totalMarks : 0), 0) / results.length) * 100
  )
  const domainCounts = results.reduce((acc, r) => {
    const domainName = r.domain?.name || 'Unknown'
    acc[domainName] = (acc[domainName] || 0) + 1
    return acc
  }, {})
  const topDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  // Backend now sets this directly on the Exam document whenever
  // the server force-completes an exam due to timeout.
  const isAutoSubmitted = (r) => Boolean(r.autoSubmitted)

  return (
    <div>
      <div className="stats-strip">
        <div className="stat-card">
          <span className="stat-value">{results.length}</span>
          <span className="stat-label">Candidates assessed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{avgPct}%</span>
          <span className="stat-label">Average score</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{results.filter(isAutoSubmitted).length}</span>
          <span className="stat-label">Auto-submitted (timed out)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{results.filter((r) => r.isStuck).length}</span>
          <span className="stat-label">Stuck in progress</span>
        </div>
        <div className="stat-card">
          <span className="stat-value domain-cell">{topDomain || '—'}</span>
          <span className="stat-label">Most attempted domain</span>
        </div>
      </div>

      <div className="results-table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Domain</th>
              <th>Status</th>
              <th>Score</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <Fragment key={r._id}>
                <tr className={expandedId === r._id ? 'row-expanded' : ''}>
                  <td>
                    <div className="candidate-name">{r.user?.name || 'Unknown'}</div>
                    <div className="candidate-contact">{r.user?.email}</div>
                  </td>
                  <td className="domain-cell">{r.domain?.name || '—'}</td>
                  <td>
                    {r.status === 'completed' ? (
                      <span className="type-tag">Completed</span>
                    ) : r.isStuck ? (
                      <span className="tag tag--incorrect">Stuck / abandoned</span>
                    ) : (
                      <span className="tag tag--manual">In progress</span>
                    )}
                  </td>
                  <td>
                    <span className="score-pill">
                      {r.score}/{r.totalMarks}
                    </span>
                    {isAutoSubmitted(r) && <span className="auto-tag">auto</span>}
                  </td>
                  <td className="muted-cell">{formatDate(r.endTime)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-ghost btn-small"
                      onClick={() => handleToggleDetails(r._id)}
                    >
                      {expandedId === r._id ? 'Hide' : 'View details'}
                    </button>
                    {r.status !== 'completed' && (
                      <button
                        type="button"
                        className="btn-ghost btn-small btn-danger"
                        style={{ marginLeft: 8 }}
                        disabled={finishingId === r._id}
                        onClick={() => handleForceFinish(r)}
                      >
                        {finishingId === r._id ? 'Finishing…' : 'Force finish'}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedId === r._id && (
                  <tr className="breakdown-row">
                    <td colSpan={6}>
                      {detailsLoading && <p className="loading-text">Loading details…</p>}
                      {detailsError && <p className="form-error">{detailsError}</p>}
                      {selectedExam && (
                        <div className="breakdown-list">
                          {selectedExam.questions.map((q, i) => {
                            const answer = q.answer
                            const optionLabels = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD }
                            return (
                              <div className="breakdown-item" key={q._id || i}>
                                <div className="breakdown-item-top">
                                  <span className="breakdown-index">Q{i + 1}</span>
                                  <span className="breakdown-question">{q.questionText}</span>
                                  {answer?.isCorrect === true && <span className="tag tag--correct">Correct</span>}
                                  {answer?.isCorrect === false && <span className="tag tag--incorrect">Incorrect</span>}
                                  {!answer && <span className="tag tag--manual">Not answered</span>}
                                </div>
                                {q.questionType === 'coding' ? (
                                  <>
                                    <pre className="breakdown-code">{answer?.code || '(no code submitted)'}</pre>
                                    {answer?.testCaseResults && answer.testCaseResults.length > 0 && (
                                      <ul className="test-results">
                                        {answer.testCaseResults.map((tr, ti) => (
                                          <li key={ti} className={tr.passed ? 'test-pass' : 'test-fail'}>
                                            <span className="test-icon" aria-hidden="true">
                                              {tr.passed ? '✓' : '✕'}
                                            </span>
                                            <span>
                                              Test {ti + 1}: {tr.passed ? 'passed' : 'failed'}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    {typeof answer?.passedTestCases === 'number' && (
                                      <p className="breakdown-answer">
                                        {answer.passedTestCases}/{answer.totalTestCases} test cases passed
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="breakdown-answer">
                                    Selected:{' '}
                                    {answer?.selectedOption
                                      ? `${answer.selectedOption} — ${optionLabels[answer.selectedOption] || ''}`
                                      : '(no answer)'}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DomainsTab() {
  const { adminToken } = useAdmin()
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingDomain, setEditingDomain] = useState(undefined) // undefined = closed, null = new
  const [saving, setSaving] = useState(false)

  async function refreshDomains() {
    const data = await api.admin.getDomains(adminToken)
    setDomains(data.domains)
  }

  useEffect(() => {
    api.admin
      .getDomains(adminToken)
      .then((data) => setDomains(data.domains))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [adminToken])

  async function handleSave(payload) {
    setSaving(true)
    try {
      if (payload._id) {
        await api.admin.updateDomain(payload._id, payload, adminToken)
      } else {
        await api.admin.createDomain(payload, adminToken)
      }
      await refreshDomains()
      setEditingDomain(undefined)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(domain) {
    if (!window.confirm(`Deactivate "${domain.name}"? Candidates won't be able to select it anymore.`)) return
    try {
      await api.admin.deleteDomain(domain._id, adminToken)
      await refreshDomains()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleReactivate(domain) {
    try {
      await api.admin.updateDomain(domain._id, { isActive: true }, adminToken)
      await refreshDomains()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="loading-text">Loading domains…</p>

  return (
    <div>
      <div className="questions-toolbar">
        <span className="muted-cell">
          {domains.length} domain{domains.length === 1 ? '' : 's'}
        </span>
        <button type="button" className="btn-primary btn-small" onClick={() => setEditingDomain(null)}>
          + Add domain
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="question-list">
        {domains.map((d) => (
          <div className="question-row" key={d._id}>
            <div className="question-row-main">
              <div className="question-row-top">
                <span className="question-row-text" style={{ fontWeight: 700 }}>
                  {d.name}
                </span>
                <span className="type-tag">{d.isActive === false ? 'Inactive' : 'Active'}</span>
                <span className="type-tag">{d.durationMinutes} min</span>
                <span className="type-tag">
                  {d.questionsPerExam} Qs ({d.mcqQuestionsPerExam} mcq / {d.codingQuestionsPerExam} coding)
                </span>
                <span className="type-tag">{d.totalQuestions || 0} in bank</span>
              </div>
              {d.description && <p className="question-row-text muted-cell">{d.description}</p>}
            </div>
            <div className="question-row-actions">
              <button type="button" className="btn-ghost btn-small" onClick={() => setEditingDomain(d)}>
                Edit
              </button>
              {d.isActive === false ? (
                <button type="button" className="btn-ghost btn-small" onClick={() => handleReactivate(d)}>
                  Reactivate
                </button>
              ) : (
                <button type="button" className="btn-ghost btn-small btn-danger" onClick={() => handleDeactivate(d)}>
                  Deactivate
                </button>
              )}
            </div>
          </div>
        ))}
        {!domains.length && <p className="empty-state">No domains yet.</p>}
      </div>

      {editingDomain !== undefined && (
        <DomainForm
          domain={editingDomain}
          saving={saving}
          onCancel={() => setEditingDomain(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function QuestionsTab() {
  const { adminToken } = useAdmin()
  const [domains, setDomains] = useState([])
  const [activeDomain, setActiveDomain] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingQuestion, setEditingQuestion] = useState(undefined) // undefined = closed, null = new
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.admin
      .getDomains(adminToken)
      .then((data) => {
        const activeDomains = data.domains.filter((d) => d.isActive !== false)
        setDomains(activeDomains)
        setActiveDomain((prev) => prev || activeDomains[0]?._id)
      })
      .catch((err) => setError(err.message))
  }, [adminToken])

  useEffect(() => {
    if (!activeDomain) return
    setLoading(true)
    api.admin
      .getQuestions(activeDomain, adminToken)
      .then((data) => setQuestions(data.questions))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [activeDomain, adminToken])

  async function refreshQuestions() {
    const data = await api.admin.getQuestions(activeDomain, adminToken)
    setQuestions(data.questions)
  }

  async function handleSave(payload) {
    setSaving(true)
    try {
      await api.admin.saveQuestion(activeDomain, payload, adminToken)
      await refreshQuestions()
      setEditingQuestion(undefined)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(question) {
    if (!window.confirm(`Delete this question?\n\n"${question.questionText}"`)) return
    try {
      await api.admin.deleteQuestion(activeDomain, question._id, adminToken)
      await refreshQuestions()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="domain-tabs">
        {domains.map((d) => (
          <button
            key={d._id}
            type="button"
            className={`domain-tab ${activeDomain === d._id ? 'domain-tab--active' : ''}`}
            onClick={() => setActiveDomain(d._id)}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="questions-toolbar">
        <span className="muted-cell">
          {questions.length} question{questions.length === 1 ? '' : 's'}
        </span>
        <button type="button" className="btn-primary btn-small" onClick={() => setEditingQuestion(null)}>
          + Add question
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="loading-text">Loading questions…</p>
      ) : (
        <div className="question-list">
          {questions.map((q, i) => (
            <div className="question-row" key={q._id}>
              <div className="question-row-main">
                <div className="question-row-top">
                  <span className="breakdown-index">Q{i + 1}</span>
                  <span className="type-tag">{q.questionType}</span>
                  <span className="type-tag">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
                </div>
                <p className="question-row-text">{q.questionText}</p>
              </div>
              <div className="question-row-actions">
                <button type="button" className="btn-ghost btn-small" onClick={() => setEditingQuestion(q)}>
                  Edit
                </button>
                <button type="button" className="btn-ghost btn-small btn-danger" onClick={() => handleDelete(q)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!questions.length && <p className="empty-state">No questions in this domain yet.</p>}
        </div>
      )}

      {editingQuestion !== undefined && (
        <QuestionForm
          domain={activeDomain}
          question={editingQuestion}
          saving={saving}
          onCancel={() => setEditingQuestion(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { logout } = useAdmin()
  const navigate = useNavigate()
  const [tab, setTab] = useState('results')

  function handleLogout() {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Assessment dashboard</h1>
        </div>
        <button type="button" className="btn-ghost" onClick={handleLogout}>
          Log out
        </button>
      </div>

      <div className="admin-tabs">
        <button type="button" className={`admin-tab ${tab === 'results' ? 'admin-tab--active' : ''}`} onClick={() => setTab('results')}>
          Candidate results
        </button>
        <button type="button" className={`admin-tab ${tab === 'domains' ? 'admin-tab--active' : ''}`} onClick={() => setTab('domains')}>
          Domains
        </button>
        <button type="button" className={`admin-tab ${tab === 'questions' ? 'admin-tab--active' : ''}`} onClick={() => setTab('questions')}>
          Questions
        </button>
      </div>

      <div className="admin-panel">
        {tab === 'results' && <ResultsTab />}
        {tab === 'domains' && <DomainsTab />}
        {tab === 'questions' && <QuestionsTab />}
      </div>
    </div>
  )
}