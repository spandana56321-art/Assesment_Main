import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { api } from "../services/api";
import "../styles/Login.css";

export default function Login() {
  const { updateUser } = useUser();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ============================================
  // HANDLE INPUT CHANGE
  // ============================================

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // ============================================
  // HANDLE REGISTER
  // ============================================

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    // ==========================================
    // VALIDATION
    // ==========================================

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    // -------------------------------
    // NAME
    // -------------------------------

    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    if (name.length < 3) {
      setError("Name must be at least 3 characters long.");
      return;
    }

    const nameRegex = /^[A-Za-z]+(?:[\s'.-][A-Za-z]+)*$/;

    if (!nameRegex.test(name)) {
      setError(
        "Name should only contain letters and spaces (no numbers or special characters)."
      );
      return;
    }

    // -------------------------------
    // EMAIL
    // -------------------------------

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex =
      /^[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    const emailLocalPart = email.split("@")[0];

    if (/^\d+$/.test(emailLocalPart)) {
      setError("Email cannot be only numbers before the @ symbol.");
      return;
    }

    // -------------------------------
    // PHONE
    // -------------------------------

    if (!phone) {
      setError("Please enter your phone number.");
      return;
    }

    const phoneDigitsOnly = phone.replace(/[\s+\-]/g, "");

    if (!/^\d+$/.test(phoneDigitsOnly)) {
      setError("Phone number should contain only digits, spaces, + or -.");
      return;
    }

    if (phoneDigitsOnly.length < 10 || phoneDigitsOnly.length > 13) {
      setError("Please enter a valid phone number (10-13 digits).");
      return;
    }

    if (/^(\d)\1+$/.test(phoneDigitsOnly)) {
      setError("Please enter a valid phone number.");
      return;
    }

    setLoading(true);

    try {
      // ========================================
      // REGISTER WITH BACKEND
      // ========================================

      const data = await api.register({
        name,
        email,
        phone,
      });

      console.log(
        "Registration response:",
        data
      );

      // ========================================
      // STORE USER + OTP USER ID
      // ========================================

      updateUser({
        otpUserId: data.userId,

        name,
        email,
        phone,

        token: null,

        isVerified: false,
        isTermsAccepted: false,

        // Clear old assessment data
        examId: null,
        questions: [],
        domain: null,
        score: 0,
        totalMarks: 0,
        examStatus: null,
        autoSubmitted: false,
        testEndTime: null,
      });

      // ========================================
      // MOVE TO OTP SCREEN
      // ========================================

      navigate("/otp");
    } catch (err) {
      console.error(
        "Registration error:",
        err
      );

      setError(
        err.message ||
          "Unable to send verification code."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // UI
  // ============================================

  return (
    <div className="auth-layout">

      {/* =========================================
          LEFT PANEL
      ========================================= */}

      <aside className="auth-panel">

        <span className="auth-corner auth-corner--tr" aria-hidden="true" />
        <span className="auth-corner auth-corner--bl" aria-hidden="true" />

        <div className="auth-panel-inner">

          <div className="auth-panel-top">

            <img
              className="candidate-login-logo"
              src="/branding/myhourly-mark.png"
              alt="HourlyRecruit Tech Labs"
            />

            <span className="auth-badge-tag">
              CANDIDATE
            </span>

          </div>

          <div className="auth-panel-copy">

            <p className="auth-panel-eyebrow">
              Assessment portal
            </p>

            <h2>
              A calmer way to prove
              <br />
              what you know.
            </h2>

            <p>
              Verify your identity, pick a track,
              and complete a short, focused
              assessment. Your responses are
              recorded securely when you submit.
            </p>

            <ul className="auth-feature-list">

              <li>
                <span className="feature-icon">
                  ✓
                </span>

                Multiple technical domains
              </li>

              <li>
                <span className="feature-icon">
                  ✓
                </span>

                Email OTP verification before
                you begin
              </li>

              <li>
                <span className="feature-icon">
                  ✓
                </span>

                Answers recorded securely on
                the server
              </li>

            </ul>

          </div>

          <div className="auth-panel-footer">
            <span className="auth-panel-footnote">
              Hire. Work. Earn. By the hour.
            </span>

            <span className="auth-status">
              <span className="auth-status-dot" aria-hidden="true" />
              SECURE
            </span>
          </div>

        </div>

      </aside>

      {/* =========================================
          RIGHT FORM
      ========================================= */}

      <section className="auth-form-side">

        <div className="auth-form-card">

          {/* ROLE SWITCH */}

          <div className="role-toggle">

            <button
              type="button"
              className="role-toggle-btn role-toggle-btn--active"
            >
              Candidate
            </button>

            <button
              type="button"
              className="role-toggle-btn"
              onClick={() =>
                navigate("/admin/login")
              }
            >
              Admin
            </button>

          </div>

          {/* STEP */}

          <p className="eyebrow">
            Get started
          </p>

          <h1>
            Create your account
          </h1>

          <p className="subtitle">
            Enter your details to receive a
            6-digit verification code by email.
          </p>

          {/* =======================================
              FORM
          ======================================= */}

          <form
            onSubmit={handleSubmit}
            noValidate
          >

            {/* NAME */}

            <div className="field">

              <label htmlFor="name">
                Full name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Please Enter Your FullName"
                disabled={loading}
              />

            </div>

            {/* EMAIL */}

            <div className="field">

              <label htmlFor="email">
                Work or college email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                disabled={loading}
              />

            </div>

            {/* PHONE */}

            <div className="field">

              <label htmlFor="phone">
                Phone number
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                disabled={loading}
              />

            </div>

            {/* ERROR */}

            {error && (
              <p className="form-error">
                {error}
              </p>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              className="btn-primary btn-block"
              disabled={loading}
            >
              {loading
                ? "Sending verification code..."
                : "Send verification code"}
            </button>

          </form>

          {/* LEGAL */}

          {/* <p className="auth-form-legal">
            By continuing you agree this
            assessment reflects your own,
            unaided work.
          </p> */}

        </div>

      </section>

    </div>
  );
}