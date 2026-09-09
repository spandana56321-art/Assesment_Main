import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { api } from "../services/api";
import {
  attachVerificationToExam,
  saveVerificationDraft,
} from "../services/localMediaStore";
import { validateIdentityCapture } from "../services/verificationValidator";
import "../styles/Verification.css";

const ID_INSTRUCTION =
  "Hold a real, physical government-issued ID beside your face. Your face and the complete ID must be clearly visible in the same live camera photo.";

export default function Verification() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const domain = location.state?.domain || null;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraError, setCameraError] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    if (!user?.token) {
      navigate("/", { replace: true });
      return;
    }
    if (!domain?._id) navigate("/domains", { replace: true });
  }, [domain, navigate, user?.token]);

  async function startCamera() {
    setCameraError("");
    setValidation(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("unsupported");
      setCameraError("Camera access is not supported by this browser.");
      return;
    }

    try {
      setCameraStatus("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraStatus("streaming");
    } catch (err) {
      setCameraStatus(err?.name === "NotAllowedError" ? "denied" : "error");
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Camera permission is required. Allow camera access in your browser and try again."
          : err?.message || "Unable to access your camera."
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (domain?._id) startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain?._id]);

  async function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || cameraStatus !== "streaming") return;

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setCameraError("Camera is not ready yet. Please wait a moment and try again.");
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    stopCamera();
    setPhotoDataUrl(dataUrl);
    setValidating(true);
    setValidation(null);

    try {
      const result = await validateIdentityCapture(dataUrl);
      setValidation(result);
    } catch (error) {
      setValidation({
        valid: false,
        errors: [error?.message || "Unable to validate the captured photo."],
        warnings: [],
      });
    } finally {
      setValidating(false);
    }
  }

  function retakePhoto() {
    setPhotoDataUrl(null);
    setValidation(null);
    setCameraError("");
    startCamera();
  }

  async function handleStartAssessment() {
    if (starting || !photoDataUrl || !validation?.valid || !domain?._id) return;

    try {
      setStarting(true);
      setStartError("");

      await saveVerificationDraft({
        photoDataUrl,
        verificationStatus: "preflight_passed",
        validationSummary: {
          faceDetected: validation.faceDetected,
          checkedAt: new Date().toISOString(),
        },
      });

      const exam = await api.startExam(domain._id, user.token);
      if (
        !exam?.success ||
        !exam.examId ||
        !Array.isArray(exam.questions) ||
        !exam.startTime ||
        !exam.durationMinutes
      ) {
        throw new Error(exam?.message || "Invalid exam response from server.");
      }
      if (!exam.questions.length) {
        throw new Error("No questions are available for this assessment.");
      }

      const startTimeMs = new Date(exam.startTime).getTime();
      const durationMinutes = Number(exam.durationMinutes);
      if (Number.isNaN(startTimeMs) || !durationMinutes || durationMinutes <= 0) {
        throw new Error("Invalid assessment timing received from server.");
      }

      const totalMarks = exam.questions.reduce(
        (total, question) => total + Number(question?.marks || 0),
        0
      );

      try {
        await attachVerificationToExam(exam.examId, user.id);
      } catch (mediaError) {
        console.warn("Local verification storage failed:", mediaError);
      }

      updateUser({
        token: user.token,
        domain: domain._id,
        domainId: domain._id,
        selectedDomain: domain,
        examId: exam.examId,
        examStatus: exam.status || "in_progress",
        questions: exam.questions,
        durationMinutes,
        startTime: exam.startTime,
        testEndTime: startTimeMs + durationMinutes * 60 * 1000,
        score: 0,
        totalMarks,
        autoSubmitted: false,
        answers: {},
      });

      navigate("/quiz", { replace: true });
    } catch (err) {
      console.error("Start exam error:", err);
      setStartError(err?.message || "Unable to start the assessment.");
    } finally {
      setStarting(false);
    }
  }

  if (!user?.token || !domain?._id) return null;

  const readyToStart = Boolean(photoDataUrl && validation?.valid && !validating);

  return (
    <div className="assessment-card verify-card">
      <div className="verify-intro">
        <div>
          <p className="eyebrow">Step 4 · Identity check</p>
          <h1>Verify yourself before the assessment</h1>
          <p className="subtitle">
            Take one live camera photo while holding a physical government-issued ID beside your face.
            This step is required before <strong>{domain.name}</strong> can start.
          </p>
        </div>
        <span className="verify-local-badge">Camera-only capture</span>
      </div>

      <div className="verify-guidance">
        <div className="verify-guidance-icon">✓</div>
        <div>
          <strong>Use a real physical ID</strong>
          <p>{ID_INSTRUCTION}</p>
          <ul>
            <li>Do not use a screenshot, scanned copy, printout or photo shown on another screen.</li>
            <li>Keep the entire card inside the camera frame.</li>
            <li>Use good lighting and keep the camera steady.</li>
            <li>Only the candidate should be visible.</li>
          </ul>
        </div>
      </div>

      <section className="verify-section">
        <div className="verify-section-heading">
          <span className="verify-step-num">1</span>
          <div>
            <h2>Live identity photo</h2>
            <p>Your camera is used for a live capture. There is no photo upload option.</p>
          </div>
        </div>

        <div className="verify-camera-box">
          {!photoDataUrl && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`verify-video ${cameraStatus === "streaming" ? "verify-video--visible" : ""}`}
            />
          )}

          {!photoDataUrl && cameraStatus === "requesting" && (
            <div className="verify-camera-message"><span className="verify-spinner" /> Requesting camera access…</div>
          )}
          {!photoDataUrl && ["denied", "error", "unsupported"].includes(cameraStatus) && (
            <div className="verify-camera-message verify-camera-message--error">{cameraError}</div>
          )}
          {photoDataUrl && (
            <img src={photoDataUrl} alt="Candidate holding government ID" className="verify-photo-preview" />
          )}

          {!photoDataUrl && cameraStatus === "streaming" && (
            <div className="verify-camera-guide">
              <span className="verify-face-guide" />
              <span className="verify-id-guide">Hold ID here</span>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} hidden />

        <div className="verify-camera-actions">
          {!photoDataUrl && cameraStatus === "streaming" && (
            <button type="button" className="btn-primary" onClick={capturePhoto}>
              Capture live photo
            </button>
          )}
          {!photoDataUrl && ["denied", "error", "unsupported"].includes(cameraStatus) && (
            <button type="button" className="btn-secondary" onClick={startCamera}>Try camera again</button>
          )}
          {photoDataUrl && (
            <button type="button" className="btn-secondary" onClick={retakePhoto} disabled={validating}>
              Retake photo
            </button>
          )}
        </div>
      </section>

      {photoDataUrl && (
        <section className={`verify-validation ${validating ? "is-checking" : validation?.valid ? "is-valid" : "is-invalid"}`}>
          <div className="verify-validation-title">
            <span>{validating ? "…" : validation?.valid ? "✓" : "!"}</span>
            <strong>{validating ? "Checking your capture…" : validation?.valid ? "Photo quality checks passed" : "Photo needs another capture"}</strong>
          </div>
          {validating && <p>Checking camera quality and candidate visibility. Please wait.</p>}
          {!validating && validation?.errors?.length > 0 && (
            <ul>{validation.errors.map((error) => <li key={error}>{error}</li>)}</ul>
          )}
          {!validating && validation?.warnings?.length > 0 && (
            <div className="verify-validation-note">{validation.warnings[0]}</div>
          )}
        </section>
      )}

      <section className="verify-section verify-final-check">
        <div className="verify-section-heading">
          <span className="verify-step-num">2</span>
          <div>
            <h2>Ready to start?</h2>
            <p>The assessment begins only after the live-photo pre-check passes.</p>
          </div>
        </div>

        <div className="verify-requirements">
          <span>✓ Live camera capture</span>
          <span>✓ Face visibility check</span>
          <span>✓ Image-quality check</span>
          <span>✓ Physical ID must be visible in the captured frame</span>
        </div>
      </section>

      {startError && <p className="form-error">{startError}</p>}

      <button
        type="button"
        className="btn-primary btn-block verify-start-btn"
        onClick={handleStartAssessment}
        disabled={!readyToStart || starting}
      >
        {starting ? "Preparing secure assessment…" : "Continue to assessment"}
      </button>

      {!readyToStart && (
        <p className="verify-gate-hint">
          Capture a clear live photo showing your face and the physical government ID before continuing.
        </p>
      )}
    </div>
  );
}
