import { useEffect, useState } from 'react'
import './Timer.css'

const WARNING_THRESHOLD_SECONDS = 5 * 60 // last 5 minutes turn red

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Countdown badge that ticks down to `endTime` (a timestamp in ms) and
 * calls `onExpire` exactly once when time runs out. Recomputes remaining
 * time from wall-clock time on every tick, so it stays correct even if
 * the tab was backgrounded/throttled.
 */
export default function Timer({ endTime, onExpire }) {
  const [remaining, setRemaining] = useState(() => Math.round((endTime - Date.now()) / 1000))

  useEffect(() => {
    if (!endTime) return

    const tick = () => {
      const secondsLeft = Math.round((endTime - Date.now()) / 1000)
      setRemaining(secondsLeft)
      if (secondsLeft <= 0) {
        onExpire()
      }
    }

    tick()
    const intervalId = setInterval(tick, 1000)
    return () => clearInterval(intervalId)
  }, [endTime, onExpire])

  const isWarning = remaining <= WARNING_THRESHOLD_SECONDS

  return (
    <div className={`timer-badge ${isWarning ? 'timer-badge--warning' : ''}`} role="timer" aria-live="polite">
      <span className="timer-icon" aria-hidden="true">
        ⏱
      </span>
      <span className="timer-value">{formatTime(remaining)}</span>
    </div>
  )
}
