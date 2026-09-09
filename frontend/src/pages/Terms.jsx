import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { api } from "../services/api";
import "../styles/Terms.css";

export default function Terms() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==================================================
  // AUTH CHECK
  // ==================================================

  useEffect(() => {
    if (!user.token) {
      navigate("/", {
        replace: true,
      });
    }
  }, [user.token, navigate]);

  if (!user.token) {
    return null;
  }

  // ==================================================
  // ACCEPT TERMS
  // ==================================================

  async function handleStart() {
    if (!agreed) {
      setError(
        "Please agree to the terms before continuing."
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      // ----------------------------------------------
      // REAL BACKEND API
      // ----------------------------------------------

      const data = await api.acceptTerms(
        user.token
      );

      console.log(
        "Accept terms response:",
        data
      );

      // ----------------------------------------------
      // SAFETY CHECK
      // ----------------------------------------------

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Unable to accept terms."
        );
      }

      // ----------------------------------------------
      // UPDATE USER STATE
      // ----------------------------------------------

      updateUser({
        isTermsAccepted: true,
        agreedToTerms: true,
      });

      // ----------------------------------------------
      // MOVE TO DOMAINS
      // ----------------------------------------------

      navigate("/domains", {
        replace: true,
      });

    } catch (err) {
      console.error(
        "Accept terms error:",
        err
      );

      setError(
        err.message ||
          "Unable to accept the terms."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="assessment-card">

      <p className="eyebrow">
        Step 2 of 5
      </p>

      <h1>
        Terms &amp; conditions
      </h1>

      <div className="terms-box">

        <p>
          By taking this assessment, you confirm that you are the person
          registered for this assessment and that all information provided
          during verification is accurate.
        </p>

        <p>
          You must complete the assessment independently. Do not use
          another person, notes, books, phones, search engines, AI tools,
          messaging applications, screen-sharing tools, or any other
          external assistance unless explicitly permitted.
        </p>

        <p>
          Keep your camera enabled and remain visible during the assessment.
          Your identity-verification photo and assessment recording may be
          reviewed by the assessment team for evaluation and integrity
          purposes.
        </p>

        <p>
          Stay on the assessment tab and remain in full-screen mode when
          requested. Switching tabs, leaving the assessment window, or
          exiting full-screen may be recorded as an integrity warning.
        </p>

        <p>
          Three integrity warnings may result in the assessment being
          automatically submitted and ended. Accidental or repeated
          attempts to leave the assessment may therefore affect completion.
        </p>

        <p>
          Do not refresh the page, close the browser, navigate away, or
          intentionally disconnect the assessment while the test is in
          progress. If a technical issue occurs, return to the assessment
          as soon as possible.
        </p>

        <p>
          Answer each question within the allotted time. The assessment may
          submit automatically when the timer reaches zero, including any
          unanswered questions.
        </p>

        <p>
          Once an assessment is submitted, you may not be able to modify
          your answers. Your responses, score, verification information, and
          relevant assessment activity may be retained according to the
          company's assessment process.
        </p>

        <p>
          By continuing, you acknowledge that you have read these rules and
          agree to follow the assessment instructions throughout the test.
        </p>

      </div>

      {/* ==========================================
          AGREEMENT
      ========================================== */}

      <label className="checkbox-row">

        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => {
            setAgreed(e.target.checked);
            setError("");
          }}
          disabled={loading}
        />

        <span>
          I agree to the terms above
        </span>

      </label>

      {/* ==========================================
          ERROR
      ========================================== */}

      {error && (
        <p className="form-error">
          {error}
        </p>
      )}

      {/* ==========================================
          START
      ========================================== */}

      <button
        type="button"
        className="btn-primary btn-block"
        disabled={!agreed || loading}
        onClick={handleStart}
      >
        {loading
          ? "Please wait..."
          : "Continue to assessment"}
      </button>

    </div>
  );
}