import { useEffect, useRef, useState } from "react";
import "../styles/ProctorGuard.css";

const MAX_WARNINGS = 3;
const EVENT_DEBOUNCE_MS = 1500;

export default function ProctorGuard({ onViolation, examId }) {
  const storageKey = examId ? `assessment-violations:${examId}` : "assessment-violations";

  const [violations, setViolations] = useState(() => {
    try {
      const saved = Number(sessionStorage.getItem(storageKey));
      return Number.isFinite(saved) && saved > 0 ? saved : 0;
    } catch {
      return 0;
    }
  });
  const [showWarning, setShowWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  const lastIncidentAtRef = useRef(0);
  const warningTimeoutRef = useRef(null);
  const submittedRef = useRef(false);

  function persistCount(count) {
    try {
      sessionStorage.setItem(storageKey, String(count));
    } catch {
      // Session storage may be unavailable in restricted browser contexts.
    }
  }

  function logViolation(type, message) {
    const now = Date.now();

    // A single action can trigger several browser events (for example,
    // leaving full-screen can also blur the window). Treat that as one notice.
    if (now - lastIncidentAtRef.current < EVENT_DEBOUNCE_MS) return;
    lastIncidentAtRef.current = now;

    setViolations((previous) => {
      const nextCount = Math.min(previous + 1, MAX_WARNINGS);
      persistCount(nextCount);

      const event = {
        type,
        message,
        at: new Date().toISOString(),
        count: nextCount,
      };

      if (onViolation) {
        onViolation(event, nextCount);
      }

      return nextCount;
    });

    setShowWarning(true);

    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(false);
    }, 6000);
  }

  function enterFullscreen() {
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;

    if (request) {
      request.call(el).catch((err) => {
        console.warn("Could not enter full-screen:", err);
      });
    }
  }

  useEffect(() => {
    function handleFullscreenChange() {
      const nowFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(nowFullscreen);

      if (!nowFullscreen) {
        logViolation("fullscreen-exit", "You exited full-screen mode.");
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        logViolation("tab-switch", "You switched away from the assessment tab.");
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    function handleWindowBlur() {
      if (!document.hidden) {
        logViolation("window-blur", "The assessment window lost focus.");
      }
    }

    window.addEventListener("blur", handleWindowBlur);
    return () => window.removeEventListener("blur", handleWindowBlur);
  }, []);

  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, []);

  return (
    <>
      {!isFullscreen && (
        <div className="proctor-fullscreen-prompt">
          <span>Please return to full-screen mode to continue securely.</span>
          <button type="button" className="proctor-fullscreen-btn" onClick={enterFullscreen}>
            Enter full-screen
          </button>
        </div>
      )}

      {showWarning && violations > 0 && (
        <div className={`proctor-warning ${violations >= MAX_WARNINGS ? "proctor-warning--danger" : ""}`} role="alert">
          <span className="proctor-warning-icon" aria-hidden="true">!</span>
          <div className="proctor-warning-content">
            <strong>
              {violations >= MAX_WARNINGS ? "Assessment ended" : "Integrity warning"}
            </strong>
            <span>
              {violations >= MAX_WARNINGS
                ? "Three integrity warnings were recorded. Your assessment is being submitted."
                : `${violations} of ${MAX_WARNINGS} warnings used. ${violations === 2 ? "One more warning will end the assessment." : "Please stay on the assessment tab and remain in full-screen mode."}`}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
