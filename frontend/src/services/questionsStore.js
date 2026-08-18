// -----------------------------------------------------------------------
// Question bank storage.
//
// Base questions still live in /public/mock/questions.json (static file,
// same as before). Admin edits from the dashboard are layered on top of
// that base and persisted in localStorage, so:
//   - editing/deleting a question updates it everywhere immediately
//   - new questions the admin adds show up without touching the JSON file
//   - a browser refresh doesn't lose admin changes
//
// This is a stand-in for a real database. To wire up a real backend:
//   - replace loadBase() with a GET /api/questions call
//   - replace saveQuestion()/deleteQuestion() with POST/PUT/DELETE calls
//   - delete the localStorage override logic entirely
// No other file needs to change — everything goes through the exported
// functions below.
// -----------------------------------------------------------------------

const OVERRIDES_KEY = 'admin_question_overrides_v1'

function loadOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistOverrides(overrides) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
}

let baseCache = null

async function loadBase() {
  if (baseCache) return baseCache
  const res = await fetch('/mock/questions.json')
  if (!res.ok) throw new Error('Failed to load question bank')
  baseCache = await res.json()
  return baseCache
}

// Returns the full merged bank: { [domainId]: Question[] }
// Includes correctOption/correct/referenceSolution — callers that serve
// candidates (not admins) are responsible for stripping those fields
// before sending questions to the quiz UI.
export async function getMergedBank() {
  const base = await loadBase()
  const overrides = loadOverrides()
  const domainIds = new Set([...Object.keys(base), ...Object.keys(overrides)])
  const merged = {}

  for (const domain of domainIds) {
    const baseList = base[domain] || []
    const domainOverrides = overrides[domain] || {}

    // Existing questions: apply edits, drop ones marked deleted (null)
    const patched = baseList
      .filter((q) => domainOverrides[q.id] !== null)
      .map((q) => (domainOverrides[q.id] ? { ...q, ...domainOverrides[q.id] } : q))

    // Brand-new questions added via the admin dashboard
    const baseIds = new Set(baseList.map((q) => q.id))
    const added = Object.entries(domainOverrides)
      .filter(([id, val]) => val && !baseIds.has(id))
      .map(([, val]) => val)

    merged[domain] = [...patched, ...added]
  }

  return merged
}

export async function getMergedDomainQuestions(domain) {
  const bank = await getMergedBank()
  return bank[domain] || []
}

export async function saveQuestion(domain, question) {
  const overrides = loadOverrides()
  if (!overrides[domain]) overrides[domain] = {}

  const id = question.id || `${domain}-${Date.now().toString(36)}`
  const saved = { ...question, id, domain }
  overrides[domain][id] = saved
  persistOverrides(overrides)
  return saved
}

export async function deleteQuestion(domain, id) {
  const overrides = loadOverrides()
  if (!overrides[domain]) overrides[domain] = {}
  overrides[domain][id] = null
  persistOverrides(overrides)
}

// Wipes all admin edits and reverts to the original JSON file.
export async function resetOverrides() {
  localStorage.removeItem(OVERRIDES_KEY)
}
