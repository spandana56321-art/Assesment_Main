import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { api } from "../services/api";
import "./Terms.css";

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
        Step 3 of 5
      </p>

      <h1>
        Terms &amp; conditions
      </h1>

      <div className="terms-box">

        <p>
          By taking this assessment you agree
          to answer honestly and without
          external help. Results may be used
          to evaluate your skill level for the
          selected domain.
        </p>

        <p>
          Once you pick a track, you'll have
          the allotted time to complete it.
          The assessment submits automatically
          when the timer reaches zero.
        </p>

        <p>
          Your responses and score are stored
          securely against your verified
          account.
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