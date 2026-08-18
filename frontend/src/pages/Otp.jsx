import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { api } from "../services/api";
import "./Otp.css";

// ==================================================
// HELPERS — masking email for display
// ==================================================

function maskEmail(email) {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

export default function Otp() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  // ==================================================
  // CHECK OTP USER ID
  // ==================================================

  useEffect(() => {
    if (!user.otpUserId) {
      navigate("/", { replace: true });
    }
  }, [user.otpUserId, navigate]);

  if (!user.otpUserId) {
    return null;
  }

  const destination = maskEmail(user.email);

  // ==================================================
  // OTP INPUT
  // ==================================================

  function handleCodeChange(e) {
    const value = e.target.value;

    // Only numbers
    if (!/^\d*$/.test(value)) {
      return;
    }

    // Maximum 6 digits
    if (value.length > 6) {
      return;
    }

    setCode(value);
    setError("");
    setResendMessage("");
  }

  // ==================================================
  // VERIFY OTP
  // ==================================================

  async function handleVerify(e) {
    e.preventDefault();

    setError("");
    setResendMessage("");

    // -----------------------------------------------
    // Validation
    // -----------------------------------------------

    if (!code) {
      setError("Please enter the OTP.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("OTP must be a valid 6-digit number.");
      return;
    }

    setLoading(true);

    try {
      const data = await api.verifyOtp(user.otpUserId, code);

      console.log("OTP verification response:", data);

      if (!data?.success || !data?.token || !data?.user) {
        throw new Error(data?.message || "OTP verification failed.");
      }

      // ---------------------------------------------
      // STORE AUTH DATA
      // ---------------------------------------------

      updateUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,

        token: data.token,

        isVerified: data.user.isVerified,
        isTermsAccepted: data.user.isTermsAccepted,

        // OTP is no longer needed
        otpUserId: null,
      });

      navigate("/terms", { replace: true });

    } catch (err) {
      console.error("OTP verification error:", err);
      setError(err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  }

  // ==================================================
  // RESEND OTP
  // ==================================================

  async function handleResend() {
    if (!user.otpUserId || resending || loading) {
      return;
    }

    setError("");
    setResendMessage("");
    setResending(true);

    try {
      const data = await api.resendOtp(user.otpUserId);

      console.log("OTP resend response:", data);

      setCode("");
      setResendMessage("A new OTP has been sent to your email.");

    } catch (err) {
      console.error("Resend OTP error:", err);
      setError(err.message || "Unable to resend OTP.");
    } finally {
      setResending(false);
    }
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="assessment-card">

      <p className="eyebrow">[ Step 2 of 5 ]</p>

      <h1>Confirm it's you</h1>

      <p className="subtitle">
        We've sent a 6-digit verification code to:
      </p>

      <p className="otp-email">
        <strong>{destination}</strong>
      </p>

      <form onSubmit={handleVerify} noValidate>

        <div className="field">
          <label htmlFor="otpCode">Email verification code</label>

          <input
            id="otpCode"
            name="otpCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="otp-input"
            value={code}
            onChange={handleCodeChange}
            maxLength={6}
            placeholder="000000"
            autoFocus
            disabled={loading || resending}
          />
        </div>

        {resendMessage && (
          <p className="form-success">{resendMessage}</p>
        )}

        {error && (
          <p className="form-error">{error}</p>
        )}

        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={loading || resending || code.length !== 6}
        >
          {loading ? "Verifying..." : "Verify and continue"}
        </button>

      </form>

      <div className="otp-resend">
        <p>Didn't receive the code?</p>

        <button
          type="button"
          className="otp-resend-btn"
          onClick={handleResend}
          disabled={resending || loading}
        >
          {resending ? "Sending..." : "Resend OTP"}
        </button>
      </div>

    </div>
  );
}