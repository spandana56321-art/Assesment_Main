import { useLocation } from 'react-router-dom'
import '../styles/StepBar.css'

const steps = [
  { key: 'otp', label: 'Verify email', path: '/otp' },
  { key: 'terms', label: 'Terms', path: '/terms' },
  { key: 'domain', label: 'Choose domain', path: '/domains' },
  { key: 'idcheck', label: 'Identity check', path: '/verify' },
  { key: 'quiz', label: 'Assessment', path: '/quiz' },
  { key: 'submitted', label: 'Submitted', path: '/submitted' },
]

function currentIndex(pathname) {
  const i = steps.findIndex((s) => s.path === pathname)
  return i === -1 ? 0 : i
}

export default function StepBar() {
  const location = useLocation()
  const idx = currentIndex(location.pathname)

  return (
    <div className="stepbar" role="list" aria-label="Assessment progress">
      {steps.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'active' : 'upcoming'
        return (
          <div key={s.key} className={`stepbar-item stepbar-item--${state}`} role="listitem">
            <span className="stepbar-dot">{i < idx ? '✓' : i + 1}</span>
            <span className="stepbar-label">{s.label}</span>
            {i < steps.length - 1 && <span className="stepbar-connector" />}
          </div>
        )
      })}
    </div>
  )
}
