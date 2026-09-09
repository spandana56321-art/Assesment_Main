import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { api } from "../services/api";
import "../styles/Result.css";

export default function Result() {
  const {
    user,
    updateUser,
    logout,
  } = useUser();

  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD RESULT
  // ============================================================

  useEffect(() => {
    if (!user.token || !user.examId) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;

    async function loadResult() {
      try {
        setLoading(true);
        setError("");

        console.log(
          "Loading result for exam:",
          user.examId
        );

        const data = await api.getExamResult(
          user.token,
          user.examId
        );

        console.log(
          "Exam result response:",
          data
        );

        if (!data?.exam) {
          throw new Error(
            data?.message ||
              "Invalid result received from server."
          );
        }

        if (cancelled) {
          return;
        }

        setExam(data.exam);

        // --------------------------------------------------------
        // STORE SERVER-AUTHORITATIVE RESULT
        // --------------------------------------------------------

        updateUser({
          score: Number(data.exam.score ?? 0),

          totalMarks: Number(
            data.exam.totalMarks ?? 0
          ),

          examStatus:
            data.exam.status || "completed",
        });
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Get exam result error:",
          err
        );

        setError(
          err.message ||
            "Unable to load your assessment result."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadResult();

    return () => {
      cancelled = true;
    };

    // updateUser intentionally omitted.
  }, [
    user.token,
    user.examId,
    navigate,
  ]);

  // ============================================================
  // AUTH GUARD
  // ============================================================

  if (!user.token || !user.examId) {
    return null;
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="assessment-card">
        <p className="loading-text">
          Loading your result...
        </p>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <div className="assessment-card">
        <p className="form-error">
          {error}
        </p>

        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            window.location.reload()
          }
        >
          Try again
        </button>
      </div>
    );
  }

  // ============================================================
  // NO RESULT
  // ============================================================

  if (!exam) {
    return (
      <div className="assessment-card">
        <p className="form-error">
          No result found for this assessment.
        </p>
      </div>
    );
  }

  // ============================================================
  // (Score/percentage no longer rendered on this screen — the
  // candidate isn't shown their score. It's still stored server-
  // side via updateUser() above and visible on the admin
  // dashboard.)
  // ============================================================

  // ============================================================
  // TRY ANOTHER TRACK
  // ============================================================

  function restart() {
    updateUser({
      examId: null,

      selectedDomain: null,

      questions: [],

      durationMinutes: null,

      startTime: null,

      testEndTime: null,

      examStatus: null,

      score: 0,

      totalMarks: 0,

      autoSubmitted: false,
    });

    navigate("/domains", {
      replace: true,
    });
  }

  // ============================================================
  // LOGOUT / EXIT
  // ============================================================

  function handleLogout() {
    logout();

    navigate("/", {
      replace: true,
    });
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="assessment-card assessment-card--result">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <p className="eyebrow">
        Session complete
      </p>

      <h1>
        Nice work,{" "}
        {user.name?.split(" ")[0] ||
          "there"}
      </h1>

      <p className="subtitle">
        Your assessment has been submitted
      </p>

      {/* ======================================================
          AUTO SUBMISSION
      ====================================================== */}

      {user.autoSubmitted && (
        <p className="readout-note">
          Time's up — your answers were
          submitted automatically.
        </p>
      )}

      {/* ======================================================
          DOMAIN
      ====================================================== */}

      {exam.domain?.name && (
        <p className="submitted-note">
          Assessment:{" "}
          <strong>
            {exam.domain.name}
          </strong>
        </p>
      )}

      {/* ======================================================
          SUBMISSION CONFIRMATION
          (Score is intentionally not shown to candidates —
          it's visible to admins only, on the admin dashboard.)
      ====================================================== */}

      <div className="readout readout--submitted">
        <svg
          viewBox="0 0 120 120"
          className="readout-ring"
        >
          <circle
            cx="60"
            cy="60"
            r="52"
            className="readout-track"
          />

          <circle
            cx="60"
            cy="60"
            r="52"
            className="readout-value-ring readout-value-ring--complete"
          />
        </svg>

        <div className="readout-center">
          <span
            className="readout-score"
            style={{ fontSize: "1.05rem" }}
          >
            Submitted
          </span>
        </div>
      </div>

      {/* ======================================================
          SERVER STATUS
      ====================================================== */}

      <p className="submitted-note">
        Your responses were recorded and
        stored by the server. Your results
        will be shared with you separately.
      </p>

      {/* ======================================================
          ACTIONS
      ====================================================== */}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: "100%",
          maxWidth: "360px",
          margin: "0 auto",
        }}
      >

        {/* TRY ANOTHER TRACK */}

        <button
          type="button"
          className="btn-primary"
          onClick={restart}
        >
          Try another track
        </button>

        {/* LOGOUT */}

        <button
          type="button"
          className="btn-secondary"
          onClick={handleLogout}
        >
          Exit / Log out
        </button>

      </div>

    </div>
  );
}