import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { api } from "../../services/api";
import { getAssessmentMedia, listAssessmentMedia, removeAssessmentMedia } from "../../services/localMediaStore";
import QuestionForm from "./QuestionForm";
import DomainForm from "./DomainForm";
import "../../styles/AdminDashboard.css";

const LOGO = "/branding/myhourly-mark.png";
const formatDate = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
const pct = (score, total) => total ? Math.round((Number(score || 0) / Number(total)) * 100) : 0;

function StatCard({ icon, label, value, note, tone = "blue" }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-card-icon">{icon}</span>
      <div><strong>{value}</strong><span>{label}</span><small>{note}</small></div>
    </article>
  );
}

function Overview({ results, stats, onReview }) {
  const completed = results.filter((item) => item.status === "completed");
  const average = completed.length ? Math.round(completed.reduce((sum, item) => sum + pct(item.score, item.totalMarks), 0) / completed.length) : 0;
  const active = results.filter((item) => item.status === "in_progress").length;
  const flagged = results.filter((item) => item.status === "completed" && item.autoSubmitted).length;
  const recent = [...results].sort((a, b) => new Date(b.endTime || b.createdAt || 0) - new Date(a.endTime || a.createdAt || 0)).slice(0, 6);
  const domains = Object.entries(results.reduce((map, item) => {
    const name = item.domain?.name || "Unknown";
    map[name] = (map[name] || 0) + 1;
    return map;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="admin-page">
      <PageHeader eyebrow="Overview" title="Assessment operations" description="A clean view of candidate activity, performance and review evidence." />

      <div className="stats-grid">
        <StatCard icon="◉" label="Candidates" value={stats?.totalUsers ?? results.length} note="Registered candidates" />
        <StatCard icon="✓" label="Completed" value={completed.length} note={`${active} currently in progress`} tone="green" />
        <StatCard icon="%" label="Average score" value={`${average}%`} note="Completed attempts" tone="purple" />
        <StatCard icon="!" label="Needs review" value={flagged} note="Auto-submitted attempts" tone="orange" />
      </div>

      <div className="dashboard-grid dashboard-grid--two">
        <section className="surface-card">
          <CardHeader title="Recent attempts" subtitle="Latest assessment activity" action={recent.length ? <button className="text-button" onClick={() => onReview(recent[0])}>Open latest</button> : null} />
          <div className="activity-list">
            {recent.map((item) => (
              <button className="activity-item" key={item._id} onClick={() => onReview(item)}>
                <span className="avatar">{(item.user?.name || "?").slice(0, 1).toUpperCase()}</span>
                <span className="activity-copy"><strong>{item.user?.name || "Unknown candidate"}</strong><small>{item.domain?.name || "Assessment"} · {formatDate(item.endTime || item.createdAt)}</small></span>
                <span className={`status-badge ${item.status === "completed" ? "status-badge--success" : "status-badge--warning"}`}>{item.status === "completed" ? `${pct(item.score, item.totalMarks)}%` : "In progress"}</span>
                <span className="chevron">›</span>
              </button>
            ))}
            {!recent.length && <EmptyState title="No assessment activity" text="Completed and active attempts will appear here." />}
          </div>
        </section>

        <section className="surface-card">
          <CardHeader title="Assessment mix" subtitle="Most attempted domains" />
          <div className="domain-bars">
            {domains.map(([name, count]) => (
              <div className="domain-bar" key={name}>
                <div><span>{name}</span><strong>{count}</strong></div>
                <div className="bar-track"><i style={{ width: `${Math.max(8, (count / Math.max(1, results.length)) * 100)}%` }} /></div>
              </div>
            ))}
            {!domains.length && <EmptyState title="No domains yet" text="Create an assessment domain to start building the test." />}
          </div>
        </section>
      </div>

      <section className="overview-strip">
        <div><span className="overview-strip-icon">✓</span><div><strong>Candidate-first flow</strong><p>Clear instructions, progress tracking and confirmation before final submission.</p></div></div>
        <div><span className="overview-strip-icon">ID</span><div><strong>Local verification media</strong><p>Identity photo, ID document and session recording stay in this browser's local storage.</p></div></div>
        <div><span className="overview-strip-icon">Q</span><div><strong>Maintainable question bank</strong><p>Use the Questions area to keep domains, types, marks and test cases organized.</p></div></div>
      </section>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }) {
  return <div className="page-header"><div><p className="page-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function CardHeader({ title, subtitle, action }) {
  return <div className="card-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>;
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><strong>{title}</strong><span>{text}</span></div>;
}

function CandidateModal({ exam, onClose }) {
  const [tab, setTab] = useState("overview");
  const [media, setMedia] = useState(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [urls, setUrls] = useState({ photo: "", recording: "" });
  const urlsRef = useRef({ photo: "", recording: "" });

  useEffect(() => {
    let cancelled = false;
    setMediaLoading(true);
    getAssessmentMedia(exam._id)
      .then((value) => { if (!cancelled) setMedia(value); })
      .catch((error) => { if (!cancelled) setMediaError(error.message); })
      .finally(() => { if (!cancelled) setMediaLoading(false); });
    return () => { cancelled = true; };
  }, [exam._id]);

  useEffect(() => () => Object.values(urlsRef.current).forEach((url) => url && URL.revokeObjectURL(url)), []);

  function preview(kind) {
    const source = kind === "photo" ? media?.verification?.verificationPhoto : media?.recording?.blob;
    if (!source) return;
    const url = typeof source === "string" ? source : URL.createObjectURL(source);
    if (urlsRef.current[kind] && urlsRef.current[kind] !== url && !urlsRef.current[kind].startsWith("data:")) {
      URL.revokeObjectURL(urlsRef.current[kind]);
    }
    urlsRef.current = { ...urlsRef.current, [kind]: url };
    setUrls(urlsRef.current);
  }

  const score = pct(exam.score, exam.totalMarks);
  const questions = exam.questions || [];
  const verification = media?.verification;
  const recording = media?.recording;
  const localMediaReady = Boolean(verification || recording);

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="candidate-drawer" role="dialog" aria-modal="true" aria-label="Candidate report">
        <header className="drawer-header">
          <div className="candidate-identity"><span className="candidate-avatar">{(exam.user?.name || "?").slice(0, 1).toUpperCase()}</span><div><span>Candidate report</span><h2>{exam.user?.name || "Unknown candidate"}</h2><p>{exam.user?.email || "—"} · {exam.domain?.name || "—"}</p></div></div>
          <button className="close-button" onClick={onClose} aria-label="Close report">×</button>
        </header>

        <div className="candidate-summary">
          <div><small>Score</small><strong>{score}%</strong><span>{exam.score || 0}/{exam.totalMarks || 0} marks</span></div>
          <div><small>Status</small><strong>{exam.status === "completed" ? "Completed" : "In progress"}</strong><span>{exam.autoSubmitted ? "Timed out" : formatDate(exam.endTime)}</span></div>
          <div><small>Local evidence</small><strong>{localMediaReady ? "Available" : "Not found"}</strong><span>Browser-only media</span></div>
        </div>

        <nav className="drawer-tabs">
          {[['overview', 'Overview'], ['answers', 'Answers'], ['identity', 'Identity'], ['recording', 'Recording']].map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
        </nav>

        <div className="drawer-body">
          {tab === "overview" && (
            <div className="report-grid">
              <section className="report-panel report-panel--score"><p className="panel-label">Performance</p><div className="score-ring" style={{ "--score": `${score}%` }}><strong>{score}%</strong><span>overall</span></div><div className="metric-row"><span>Questions</span><strong>{questions.length}</strong></div><div className="metric-row"><span>Correct</span><strong>{questions.filter((item) => item.answer?.isCorrect).length}</strong></div><div className="metric-row"><span>Unanswered</span><strong>{questions.filter((item) => !item.answer).length}</strong></div></section>
              <section className="report-panel"><p className="panel-label">Assessment details</p><dl className="detail-list"><div><dt>Assessment</dt><dd>{exam.domain?.name || "—"}</dd></div><div><dt>Started</dt><dd>{formatDate(exam.startTime)}</dd></div><div><dt>Submitted</dt><dd>{formatDate(exam.endTime)}</dd></div><div><dt>Integrity</dt><dd>{exam.autoSubmitted ? "Timed out" : "Standard submission"}</dd></div></dl></section>
            </div>
          )}

          {tab === "answers" && <div className="answer-review">{questions.map((question, index) => { const answer = question.answer; return <article className="answer-card" key={question._id || index}><div className="answer-card-head"><span>Q{index + 1}</span><h3>{question.questionText}</h3><em className={answer?.isCorrect ? "correct" : "wrong"}>{!answer ? "Not answered" : answer.isCorrect ? "Correct" : "Incorrect"}</em></div>{question.questionType === "coding" ? <pre>{answer?.code || "No code submitted"}</pre> : <p>Selected: <b>{answer?.selectedOption || "No answer"}</b>{answer?.selectedOption && question[`option${answer.selectedOption}`] ? ` — ${question[`option${answer.selectedOption}`]}` : ""}</p>}</article>; })}{!questions.length && <EmptyState title="No answers" text="The candidate has no stored question responses." />}</div>}

          {tab === "identity" && (
            <div className="media-grid">
              <section className="media-panel"><div className="media-panel-head"><div><h3>Face + government ID capture</h3><p>Live photo captured before the assessment. The candidate was instructed to hold a physical government ID beside their face.</p></div><button className="outline-button" disabled={!verification?.verificationPhoto} onClick={() => preview("photo")}>Preview</button></div>{urls.photo ? <img src={urls.photo} className="identity-preview" alt="Candidate holding government ID" /> : <div className="media-placeholder">{verification ? "Click Preview to view the local capture" : "No local verification photo found"}</div>}<div className="verification-meta"><span><b>Status</b>{verification?.verificationStatus || "Not available"}</span><span><b>Captured</b>{formatDate(verification?.capturedAt)}</span></div></section>
              {mediaError && <p className="form-error">{mediaError}</p>}
              {mediaLoading && <p className="media-note">Loading local evidence…</p>}
            </div>
          )}

          {tab === "recording" && (
            <section className="media-panel recording-panel"><div className="media-panel-head"><div><h3>Assessment recording</h3><p>Visible to the admin console only. Stored locally in this browser.</p></div><button className="primary-button" disabled={!recording?.blob} onClick={() => preview("recording")}>Load recording</button></div>{urls.recording ? <video className="admin-video" controls playsInline src={urls.recording} /> : <div className="recording-placeholder"><span>▶</span><strong>{recording ? "Local recording ready" : "No local recording found"}</strong><small>{recording ? `${Math.round(recording.size / 1024 / 1024 * 10) / 10} MB · ${formatDate(recording.createdAt)}` : "The recording may belong to another browser/device."}</small></div>}</section>
          )}
        </div>
      </aside>
    </div>
  );
}

function Candidates({ results, token, onRefresh, localMediaMap }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => results.filter((item) => {
    const haystack = `${item.user?.name || ""} ${item.user?.email || ""} ${item.domain?.name || ""}`.toLowerCase();
    const matchesSearch = haystack.includes(query.trim().toLowerCase());
    const matchesFilter = filter === "all" || (filter === "completed" && item.status === "completed") || (filter === "active" && item.status === "in_progress") || (filter === "recording" && localMediaMap[item._id]?.recording);
    return matchesSearch && matchesFilter;
  }), [filter, localMediaMap, query, results]);

  async function open(item) {
    setError("");
    setLoading(true);
    try {
      const detail = await api.admin.getExam(item._id, token);
      setSelected(detail.exam || detail);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteReview(item) {
    if (!item?._id) return;
    setDeleting(item._id);
    setError("");
    try {
      await api.admin.deleteExam(item._id, token);
      await removeAssessmentMedia(item._id);
      if (selected?._id === item._id) setSelected(null);
      await onRefresh();
    } catch (err) {
      setError(err.message || "Unable to delete the assessment review.");
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="admin-page">
      <PageHeader eyebrow="Candidates" title="Assessment attempts" description="Review scores, answers and browser-local verification evidence." />
      <div className="filter-bar"><div className="search-field"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or domain" /></div><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All attempts</option><option value="completed">Completed</option><option value="active">In progress</option><option value="recording">Recording available</option></select></div>
      {error && <div className="admin-alert">{error}</div>}
      <section className="table-card"><div className="table-scroll"><table className="candidate-table"><thead><tr><th>Candidate</th><th>Assessment</th><th>Status</th><th>Score</th><th>Local evidence</th><th>Submitted</th><th /></tr></thead><tbody>{filtered.map((item) => { const media = localMediaMap[item._id] || {}; return <tr key={item._id}><td><div className="candidate-cell"><span className="avatar">{(item.user?.name || "?").slice(0, 1).toUpperCase()}</span><div><strong>{item.user?.name || "Unknown"}</strong><small>{item.user?.email || "—"}</small></div></div></td><td><strong>{item.domain?.name || "—"}</strong><small>{item.totalMarks || 0} total marks</small></td><td><span className={`status-badge ${item.status === "completed" ? "status-badge--success" : "status-badge--warning"}`}>{item.status === "completed" ? "Completed" : "In progress"}</span>{item.autoSubmitted && <small className="table-note">Timed out</small>}</td><td><strong className="score-value">{pct(item.score, item.totalMarks)}%</strong><small>{item.score || 0}/{item.totalMarks || 0}</small></td><td><div className="evidence-tags"><span className={media.verification ? "available" : ""}>ID</span><span className={media.recording ? "available" : ""}>REC</span></div></td><td><small>{formatDate(item.endTime)}</small></td><td><div className="row-actions"><button className="outline-button" onClick={() => open(item)}>Review</button><button className="icon-button icon-button--danger" disabled={deleting === item._id} onClick={() => setDeleteTarget(item)} title="Delete review" aria-label={`Delete ${item.user?.name || "assessment"}`}>{deleting === item._id ? "…" : "×"}</button></div></td></tr>; })}</tbody></table></div>{!filtered.length && <EmptyState title="No matching candidates" text="Try a different search or filter." />}</section>
      {loading && <div className="loading-line">Loading candidate report…</div>}
      {selected && <CandidateModal exam={selected} onClose={() => setSelected(null)} />}
      {deleteTarget && (
        <div className="modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeleteTarget(null)}>
          <div className="modal-panel delete-review-modal" role="dialog" aria-modal="true" aria-labelledby="delete-review-title">
            <div className="modal-header">
              <div>
                <span className="modal-kicker">Permanent action</span>
                <h2 id="delete-review-title">Delete assessment review?</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setDeleteTarget(null)} aria-label="Close">×</button>
            </div>
            <div className="delete-review-body">
              <div className="delete-review-icon">!</div>
              <p>This will permanently remove the review for <strong>{deleteTarget.user?.name || "this candidate"}</strong> from the assessment records and remove its locally stored ID photo, document and recording from this browser.</p>
              <p className="delete-review-warning">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="outline-button" onClick={() => setDeleteTarget(null)} disabled={Boolean(deleting)}>Cancel</button>
              <button type="button" className="danger-button" onClick={() => deleteReview(deleteTarget)} disabled={deleting === deleteTarget._id}>{deleting === deleteTarget._id ? "Deleting…" : "Delete review"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DomainsTab() {
  const { adminToken } = useAdmin();
  const [domains, setDomains] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const data = await api.admin.getDomains(adminToken);
    setDomains(data.domains || []);
  }
  useEffect(() => { refresh().catch((err) => setError(err.message)).finally(() => setLoading(false)); }, [adminToken]);
  async function save(payload) { setSaving(true); setError(""); try { if (payload._id) await api.admin.updateDomain(payload._id, payload, adminToken); else await api.admin.createDomain(payload, adminToken); await refresh(); setEditing(undefined); } catch (err) { setError(err.message); } finally { setSaving(false); } }

  return <div className="admin-page"><PageHeader eyebrow="Assessment setup" title="Domains" description="Create the assessments candidates can choose from." action={<button className="primary-button" onClick={() => setEditing(null)}>+ Add domain</button>} />{error && <div className="admin-alert">{error}</div>}{loading ? <div className="loading-line">Loading domains…</div> : <div className="setup-grid">{domains.map((domain) => <article className="setup-card" key={domain._id}><div className="setup-card-top"><span className="setup-icon">{domain.name?.slice(0, 1).toUpperCase() || "D"}</span><span className={`status-badge ${domain.isActive === false ? "" : "status-badge--success"}`}>{domain.isActive === false ? "Inactive" : "Active"}</span></div><h3>{domain.name}</h3><p>{domain.description || "No description provided."}</p><div className="setup-meta"><span>{domain.durationMinutes} min</span><span>{domain.questionsPerExam} questions</span><span>{domain.totalQuestions || 0} in bank</span></div><button className="outline-button full" onClick={() => setEditing(domain)}>Edit domain</button></article>)}</div>}{editing !== undefined && <DomainForm domain={editing} saving={saving} onCancel={() => setEditing(undefined)} onSave={save} />}</div>;
}

function QuestionsTab() {
  const { adminToken } = useAdmin();
  const [domains, setDomains] = useState([]);
  const [active, setActive] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadQuestions(domainId) {
    if (!domainId) return setQuestions([]);
    setLoading(true);
    try { const data = await api.admin.getQuestions(domainId, adminToken); setQuestions(data.questions || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { api.admin.getDomains(adminToken).then((data) => { const activeDomains = (data.domains || []).filter((domain) => domain.isActive !== false); setDomains(activeDomains); setActive(activeDomains[0]?._id || null); }).catch((err) => setError(err.message)); }, [adminToken]);
  useEffect(() => { loadQuestions(active); }, [active]);
  async function save(payload) { setSaving(true); setError(""); try { await api.admin.saveQuestion(active, payload, adminToken); await loadQuestions(active); setEditing(undefined); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  async function remove(question) { if (!window.confirm("Delete this question?")) return; try { await api.admin.deleteQuestion(active, question._id, adminToken); await loadQuestions(active); } catch (err) { setError(err.message); } }

  return <div className="admin-page"><PageHeader eyebrow="Question bank" title="Questions" description="Keep question content and coding test cases easy to maintain." action={<button className="primary-button" disabled={!active} onClick={() => setEditing(null)}>+ Add question</button>} />{error && <div className="admin-alert">{error}</div>}<div className="domain-tabs">{domains.map((domain) => <button key={domain._id} className={active === domain._id ? "active" : ""} onClick={() => setActive(domain._id)}>{domain.name}</button>)}</div>{loading ? <div className="loading-line">Loading questions…</div> : <section className="question-bank">{questions.map((question, index) => <article className="question-row" key={question._id}><span className="question-number">Q{index + 1}</span><div className="question-copy"><h3>{question.questionText}</h3><div className="question-meta"><span>{question.questionType}</span><span>{question.marks} {question.marks === 1 ? "mark" : "marks"}</span>{question.questionType === "coding" && <span>{question.testCases?.length || 0} test cases</span>}</div></div><div className="row-actions"><button className="outline-button" onClick={() => setEditing(question)}>Edit</button><button className="icon-button icon-button--danger" onClick={() => remove(question)} aria-label="Delete question">×</button></div></article>)}{!questions.length && <EmptyState title="Question bank is empty" text="Add your first question for this domain." />}</section>}{editing !== undefined && <QuestionForm domain={active} question={editing} saving={saving} onCancel={() => setEditing(undefined)} onSave={save} />}</div>;
}

export default function AdminDashboard() {
  const { adminToken, adminUser, logout } = useAdmin();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [localMediaMap, setLocalMediaMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const [examData, statData, media] = await Promise.all([api.admin.getExams(adminToken), api.admin.getStats(adminToken), listAssessmentMedia()]);
      setResults(examData.exams || []);
      setStats(statData.stats || null);
      const map = {};
      media.forEach((item) => { if (!item.examId) return; map[item.examId] = map[item.examId] || {}; if (item.kind === "verification") map[item.examId].verification = true; if (item.kind === "recording") map[item.examId].recording = true; });
      setLocalMediaMap(map);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, [adminToken]);

  const nav = [["overview", "Overview", "⌂"], ["candidates", "Candidates", "◉"], ["domains", "Domains", "◆"], ["questions", "Questions", "≡"]];
  const currentLabel = nav.find(([id]) => id === tab)?.[1] || "Overview";

  return (
    <div className="admin-console">
      <aside className="admin-sidebar">
        <div className="admin-brand"><img src={LOGO} alt="HourlyRecruit Tech Labs" /><span>Admin console</span></div>
        <div className="admin-workspace"><span className="workspace-dot" /> Assessment workspace</div>
        <nav className="admin-nav">{nav.map(([id, label, icon]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><span>{icon}</span>{label}{id === "candidates" && results.length ? <em>{results.length}</em> : null}</button>)}</nav>
        <div className="admin-sidebar-bottom"><div className="admin-user"><span>{(adminUser?.name || "A").slice(0, 1).toUpperCase()}</span><div><strong>{adminUser?.name || "Administrator"}</strong><small>{adminUser?.email || "Secure workspace"}</small></div></div><button className="logout-button" onClick={() => { logout(); navigate("/admin/login", { replace: true }); }}>Log out</button></div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar"><div><span className="topbar-kicker">HourlyRecruit</span><strong>{currentLabel}</strong></div><div className="topbar-actions"><span className="secure-pill"><i /> Protected admin session</span><button className="refresh-button" onClick={refresh}>↻ Refresh</button></div></header>
        <div className="admin-content">{error && <div className="admin-alert">{error}</div>}{loading ? <div className="loading-screen"><div className="loading-spinner" /><strong>Loading assessment workspace</strong><span>Fetching the latest candidate and question data…</span></div> : tab === "overview" ? <Overview results={results} stats={stats} onReview={(item) => { if (item) setTab("candidates"); }} /> : tab === "candidates" ? <Candidates results={results} token={adminToken} onRefresh={refresh} localMediaMap={localMediaMap} /> : tab === "domains" ? <DomainsTab /> : <QuestionsTab />}</div>
      </main>
    </div>
  );
}
