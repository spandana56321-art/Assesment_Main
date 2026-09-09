import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import '../../styles/AdminLogin.css'

export default function AdminLogin() {
  const { login } = useAdmin()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Email and password are both required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-auth-layout">
      <aside className="admin-auth-panel">
        <span className="admin-corner admin-corner--tr" aria-hidden="true" />
        <span className="admin-corner admin-corner--bl" aria-hidden="true" />

        <div className="admin-auth-panel-inner">
          <div className="admin-badge-row">
            <span className="admin-badge-mark">
              <img src="/branding/myhourly-mark.png" alt="HourlyRecruit Tech Labs" />
            </span>
            <span className="admin-badge-tag">ADMIN</span>
          </div>

          <div className="admin-panel-copy">
            <p className="admin-panel-eyebrow">Operations console</p>

            <h2 className="admin-panel-heading">
              Every assessment.
              <br />
              One console.
            </h2>

            <p className="admin-panel-body">
              Review candidate scores, curate the question bank, and keep
              every domain accurate — without ever touching the candidate
              experience.
            </p>

            <ul className="admin-capability-list">
              <li className="admin-capability-item">
                <span className="admin-capability-mark" aria-hidden="true">✓</span>
                See every candidate's score and full answer trail
              </li>
              <li className="admin-capability-item">
                <span className="admin-capability-mark" aria-hidden="true">✓</span>
                Create, edit, and retire questions per domain
              </li>
              <li className="admin-capability-item">
                <span className="admin-capability-mark" aria-hidden="true">✓</span>
                Runs on a separate console — never linked from the candidate app
              </li>
            </ul>
          </div>

          <div className="admin-panel-footer">
            <span className="admin-footer-terminal">ADMIN CONSOLE · HR-01</span>
            <span className="admin-status">
              <span className="admin-status-dot" aria-hidden="true" />
              OPERATIONAL
            </span>
          </div>
        </div>
      </aside>

      <section className="admin-auth-form-side">
        <div className="admin-auth-card">
          <div className="admin-role-toggle">
            <button type="button" className="admin-role-btn" onClick={() => navigate('/')}>
              Candidate
            </button>
            <button type="button" className="admin-role-btn admin-role-btn--active">
              Admin
            </button>
          </div>

          <p className="admin-card-eyebrow">Access control</p>
          <h1 className="admin-card-title">Sign in to the console</h1>
          <p className="admin-card-subtitle">Enter your admin credentials to continue.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={handleChange}
                placeholder="admin@myhourly.com"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="admin-signin-btn" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* <p className="admin-credential-chip">Demo credentials: admin@myhourly.com / Admin@123</p> */}
        </div>
      </section>
    </div>
  )
}