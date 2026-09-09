import { useState } from 'react'

// Matches the backend Question model's questionType enum exactly.
const TYPES = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'output', label: 'Guess the output' },
  { value: 'coding', label: 'Coding (candidate writes + runs real code)' },
]

const OPTION_KEYS = ['A', 'B', 'C', 'D']

const emptyForm = {
  _id: null,
  questionType: 'mcq',
  questionText: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctOption: 'A',
  language: '',
  starterCode: '',
  testCases: [{ input: '', expectedOutput: '', isHidden: false }],
  marks: 1,
}

function toFormState(question) {
  if (!question) {
    return {
      ...emptyForm,
      testCases: [{ input: '', expectedOutput: '', isHidden: false }],
    }
  }
  return {
    _id: question._id || null,
    questionType: question.questionType || 'mcq',
    questionText: question.questionText || '',
    optionA: question.optionA || '',
    optionB: question.optionB || '',
    optionC: question.optionC || '',
    optionD: question.optionD || '',
    correctOption: question.correctOption || 'A',
    language: question.language || '',
    starterCode: question.starterCode || '',
    testCases:
      question.testCases && question.testCases.length
        ? question.testCases.map((t) => ({
            input: t.input || '',
            expectedOutput: t.expectedOutput || '',
            isHidden: Boolean(t.isHidden),
          }))
        : [{ input: '', expectedOutput: '', isHidden: false }],
    marks: question.marks ?? 1,
  }
}

export default function QuestionForm({ domain, question, onCancel, onSave, saving }) {
  const [form, setForm] = useState(() => toFormState(question))
  const [error, setError] = useState('')

  // mcq and output both use the 4-option / correctOption shape
  const needsOptions = form.questionType === 'mcq' || form.questionType === 'output'
  const isCoding = form.questionType === 'coding'

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateTestCase(i, field, value) {
    const testCases = form.testCases.map((t, idx) => (idx === i ? { ...t, [field]: value } : t))
    setForm((prev) => ({ ...prev, testCases }))
  }

  function addTestCase() {
    setForm((prev) => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '', isHidden: false }],
    }))
  }

  function removeTestCase(i) {
    setForm((prev) => ({ ...prev, testCases: prev.testCases.filter((_, idx) => idx !== i) }))
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!form.questionText.trim()) {
      setError('Question text is required.')
      return
    }

    if (needsOptions) {
      const options = [form.optionA, form.optionB, form.optionC, form.optionD]
      if (options.some((o) => !o.trim())) {
        setError('All four options must be filled in.')
        return
      }
    }

    if (isCoding) {
      if (!form.language.trim()) {
        setError('Language is required for a coding question.')
        return
      }
      const cleanTests = form.testCases.filter((t) => t.input.trim() || t.expectedOutput.trim())
      if (!cleanTests.length) {
        setError('At least one test case is required.')
        return
      }
      if (cleanTests.some((t) => !t.input.trim() || !t.expectedOutput.trim())) {
        setError('Every test case needs both an input and an expected output.')
        return
      }
    }

    const marks = Number(form.marks)
    if (!Number.isInteger(marks) || marks < 1 || marks > 100) {
      setError('Marks must be a whole number between 1 and 100.')
      return
    }

    if (isCoding && form.testCases.length > 20) {
      setError('A coding question can contain at most 20 test cases.')
      return
    }

    const payload = {
      _id: form._id,
      questionType: form.questionType,
      questionText: form.questionText.trim(),
      marks,
    }

    if (needsOptions) {
      payload.optionA = form.optionA.trim()
      payload.optionB = form.optionB.trim()
      payload.optionC = form.optionC.trim()
      payload.optionD = form.optionD.trim()
      payload.correctOption = form.correctOption
    } else {
      payload.optionA = null
      payload.optionB = null
      payload.optionC = null
      payload.optionD = null
      payload.correctOption = null
    }

    if (isCoding) {
      payload.language = form.language.trim()
      payload.starterCode = form.starterCode
      payload.testCases = form.testCases
        .filter((t) => t.input.trim() && t.expectedOutput.trim())
        .map((t) => ({
          input: t.input.trim(),
          expectedOutput: t.expectedOutput.trim(),
          isHidden: Boolean(t.isHidden),
        }))
    } else {
      payload.language = null
      payload.starterCode = ''
      payload.testCases = []
    }

    setError('')
    onSave(payload)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{form._id ? 'Edit question' : 'Add question'}</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="question-form">
          <div className="form-row">
            <div className="field">
              <label htmlFor="qtype">Question type</label>
              <select id="qtype" value={form.questionType} onChange={(e) => update('questionType', e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="qmarks">Marks</label>
              <input
                id="qmarks"
                type="number"
                min={1}
                value={form.marks}
                onChange={(e) => update('marks', e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="qtext">Question</label>
            <textarea
              id="qtext"
              rows={2}
              value={form.questionText}
              onChange={(e) => update('questionText', e.target.value)}
              placeholder="e.g. What will this component render?"
            />
          </div>

          {needsOptions && (
            <div className="field">
              <label>Options — select the correct one</label>
              {OPTION_KEYS.map((key) => (
                <div className="option-row" key={key}>
                  <input
                    type="radio"
                    name="correctOption"
                    checked={form.correctOption === key}
                    onChange={() => update('correctOption', key)}
                  />
                  <input
                    type="text"
                    value={form[`option${key}`]}
                    onChange={(e) => update(`option${key}`, e.target.value)}
                    placeholder={`Option ${key}`}
                  />
                </div>
              ))}
            </div>
          )}

          {isCoding && (
            <>
              <div className="field">
                <label htmlFor="qlanguage">Language</label>
                <input
                  id="qlanguage"
                  value={form.language}
                  onChange={(e) => update('language', e.target.value)}
                  placeholder="javascript, python, java, cpp, c, sql, bash…"
                />
              </div>

              <div className="field">
                <label htmlFor="qstarter">Starter code (shown to the candidate in the editor)</label>
                <textarea
                  id="qstarter"
                  rows={8}
                  className="code-textarea"
                  spellCheck={false}
                  value={form.starterCode}
                  onChange={(e) => update('starterCode', e.target.value)}
                  placeholder="function solve() {\n  // TODO\n}"
                />
              </div>

              <div className="field">
                <label>
                  Test cases —{' '}
                  <span className="field-hint">
                    input + expected output, checked exactly against the candidate's program output. Recommended: 5
                    total, 3 visible + 2 hidden.
                  </span>
                </label>
                {form.testCases.map((t, i) => (
                  <div className="testcase-row" key={i}>
                    <div className="testcase-row-top">
                      <input
                        type="text"
                        value={t.input}
                        onChange={(e) => updateTestCase(i, 'input', e.target.value)}
                        placeholder="Input, e.g. 2 3"
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5 }}>
                        <input
                          type="checkbox"
                          checked={t.isHidden}
                          onChange={(e) => updateTestCase(i, 'isHidden', e.target.checked)}
                        />
                        Hidden
                      </label>
                      {form.testCases.length > 1 && (
                        <button type="button" className="btn-ghost btn-small btn-danger" onClick={() => removeTestCase(i)}>
                          Remove
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      className="code-textarea"
                      spellCheck={false}
                      value={t.expectedOutput}
                      onChange={(e) => updateTestCase(i, 'expectedOutput', e.target.value)}
                      placeholder="Expected output, e.g. 5"
                    />
                  </div>
                ))}
                <button type="button" className="btn-ghost btn-small" onClick={addTestCase}>
                  + Add test case
                </button>
              </div>
            </>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}