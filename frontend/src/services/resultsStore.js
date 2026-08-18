// Stand-in for a results table in a real database. In production,
// submitQuiz() in api.js would POST the result to the backend instead of
// calling saveResult() here, and the admin dashboard would GET /api/results
// instead of calling loadResults(). Nothing else in the app needs to change.

const RESULTS_KEY = 'admin_results_v1'

export function loadResults() {
  try {
    const raw = localStorage.getItem(RESULTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveResult(result) {
  const all = loadResults()
  const entry = {
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    ...result,
  }
  all.unshift(entry)
  localStorage.setItem(RESULTS_KEY, JSON.stringify(all))
  return entry
}

export function getResult(id) {
  return loadResults().find((r) => r.id === id) || null
}
