import { useEffect, useRef, useState } from "react";
import "../styles/Timer.css";

const WARNING_THRESHOLD_SECONDS = 5 * 60;
const DANGER_THRESHOLD_SECONDS = 60;

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function Timer({ endTime, onExpire }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!endTime) return undefined;
    expiredRef.current = false;

    const tick = () => {
      const secondsLeft = Math.ceil((endTime - Date.now()) / 1000);
      setRemaining(Math.max(0, secondsLeft));
      if (secondsLeft <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [endTime, onExpire]);

  const isDanger = remaining <= DANGER_THRESHOLD_SECONDS;
  const isWarning = remaining <= WARNING_THRESHOLD_SECONDS;

  return (
    <div className={`timer-badge ${isWarning ? "timer-badge--warning" : ""} ${isDanger ? "timer-badge--danger" : ""}`} role="timer" aria-live="polite">
      <span className="timer-icon" aria-hidden="true">◷</span>
      <span className="timer-value">{formatTime(remaining)}</span>
    </div>
  );
}
