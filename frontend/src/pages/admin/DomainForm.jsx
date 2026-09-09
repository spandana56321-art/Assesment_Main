import { useState } from 'react'

const emptyForm = {
  _id: null,
  name: '',
  description: '',
  durationMinutes: 30,
  questionsPerExam: 6,
  mcqQuestionsPerExam: 4,
  codingQuestionsPerExam: 2,
}

function toFormState(domain) {
  if (!domain) return { ...emptyForm }
  return {
    _id: domain._id || null,
    name: domain.name || '',
    description: domain.description || '',
    durationMinutes: domain.durationMinutes ?? 30,
    questionsPerExam: domain.questionsPerExam ?? 6,
    mcqQuestionsPerExam: domain.mcqQuestionsPerExam ?? 4,
    codingQuestionsPerExam: domain.codingQuestionsPerExam ?? 2,
  }
}

export default function DomainForm({ domain, onCancel, onSave, saving }) {
  const [form, setForm] = useState(() => toFormState(domain))
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!form.name.trim()) {
      setError('Domain name is required.')
      return
    }

    const duration = Number(form.durationMinutes)
    const total = Number(form.questionsPerExam)
    const mcq = Number(form.mcqQuestionsPerExam)
    const coding = Number(form.codingQuestionsPerExam)

    if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
      setError('Duration must be a whole number between 1 and 180 minutes.')
      return
    }
    if (!Number.isInteger(total) || total < 1 || total > 100) {
      setError('Questions per exam must be a whole number between 1 and 100.')
      return
    }
    if (!Number.isInteger(mcq) || !Number.isInteger(coding) || mcq < 0 || coding < 0) {
      setError('MCQ and coding counts must be whole numbers and cannot be negative.')
      return
    }
    if (mcq > total || coding > total) {
      setError('MCQ and coding counts cannot exceed the total question count.')
      return
    }
    if (mcq + coding !== total) {
      setError(`MCQ (${mcq}) + coding (${coding}) questions must add up to questions per exam (${total}).`)
      return
    }

    setError('')
    onSave({
      _id: form._id,
      name: form.name.trim(),
      description: form.description.trim(),
      durationMinutes: duration,
      questionsPerExam: total,
      mcqQuestionsPerExam: mcq,
      codingQuestionsPerExam: coding,
    })
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{form._id ? 'Edit domain' : 'Add domain'}</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="question-form">
          <div className="field">
            <label htmlFor="dname">Domain name</label>
            <input
              id="dname"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. React"
            />
          </div>

          <div className="field">
            <label htmlFor="ddesc">Description</label>
            <textarea
              id="ddesc"
              rows={2}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Shown to candidates when choosing a domain"
            />
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="dduration">Duration (minutes)</label>
              <input
                id="dduration"
                type="number"
                min={1}
                value={form.durationMinutes}
                onChange={(e) => update('durationMinutes', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="dtotal">Questions per exam</label>
              <input
                id="dtotal"
                type="number"
                min={1}
                value={form.questionsPerExam}
                onChange={(e) => update('questionsPerExam', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="dmcq">MCQ / output questions</label>
              <input
                id="dmcq"
                type="number"
                min={0}
                value={form.mcqQuestionsPerExam}
                onChange={(e) => update('mcqQuestionsPerExam', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="dcoding">Coding questions</label>
              <input
                id="dcoding"
                type="number"
                min={0}
                value={form.codingQuestionsPerExam}
                onChange={(e) => update('codingQuestionsPerExam', e.target.value)}
              />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save domain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}