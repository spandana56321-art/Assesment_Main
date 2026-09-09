import { useEffect, useRef, useState } from "react";
import "../styles/WebcamMonitor.css";

const DEFAULT = { left: 22, bottom: 22, width: 220 };

export default function WebcamMonitor() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);
  const stopPromiseRef = useRef(null);
  const resolveStopRef = useRef(null);
  const dragRef = useRef(null);
  const positionRef = useRef(DEFAULT);

  const [status, setStatus] = useState("requesting");
  const [cameraNotice, setCameraNotice] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [position, setPosition] = useState(DEFAULT);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    let cancelled = false;

    function finishRecording() {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolveStopRef.current?.(null);
        resolveStopRef.current = null;
        return;
      }
      try { recorder.stop(); } catch { resolveStopRef.current?.(null); resolveStopRef.current = null; }
    }

    window.__stopAssessmentRecording = () => {
      if (!recorderRef.current || recorderRef.current.state === "inactive") return Promise.resolve(null);
      if (stopPromiseRef.current) return stopPromiseRef.current;
      stopPromiseRef.current = new Promise((resolve) => {
        resolveStopRef.current = resolve;
        finishRecording();
      });
      return stopPromiseRef.current;
    };

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) { setStatus("unsupported"); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 400 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        stream.getVideoTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            setStatus("interrupted");
            setCameraNotice("Camera access was interrupted. Re-enable your camera to continue the assessment.");
          });
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus("live");

        if (!window.MediaRecorder) return;
        const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
        const mimeType = types.find((t) => MediaRecorder.isTypeSupported?.(t));
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
        recorder.onstop = () => {
          const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" }) : null;
          chunksRef.current = [];
          recorderRef.current = null;
          stopPromiseRef.current = null;
          resolveStopRef.current?.(blob);
          resolveStopRef.current = null;
        };
        recorder.onerror = () => {
          resolveStopRef.current?.(null);
          resolveStopRef.current = null;
        };
        recorder.start(1000);
        recorderRef.current = recorder;
        startedAtRef.current = Date.now();
        timerRef.current = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
      } catch (err) {
        if (cancelled) return;
        setStatus(err?.name === "NotAllowedError" ? "denied" : "error");
      }
    }

    start();
    return () => {
      cancelled = true;
      delete window.__stopAssessmentRecording;
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try { recorderRef.current.stop(); } catch {}
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function beginDrag(e) {
    if (e.target.closest("button")) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = { startX, startY, left: rect.left, top: rect.top };
    const move = (event) => {
      const d = dragRef.current;
      if (!d) return;
      const nextLeft = Math.max(8, Math.min(window.innerWidth - positionRef.current.width - 8, d.left + event.clientX - d.startX));
      const nextTop = Math.max(8, Math.min(window.innerHeight - 90, d.top + event.clientY - d.startY));
      setPosition((p) => ({ ...p, left: nextLeft, bottom: window.innerHeight - nextTop - Math.max(110, positionRef.current.width * 0.625) }));
    };
    const end = () => { dragRef.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  }

  function resize(e) {
    e.stopPropagation();
    const startX = e.clientX;
    const initial = position.width;
    const move = (event) => setPosition((p) => ({ ...p, width: Math.max(160, Math.min(360, initial + event.clientX - startX)) }));
    const end = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  }

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");
  const height = Math.round(position.width * 0.625);

  return (
    <div
      className={`webcam-bubble webcam-bubble--${status}`}
      style={{ left: position.left, bottom: position.bottom, width: position.width, height }}
      onPointerDown={beginDrag}
      role="status"
      aria-label="Live camera preview"
    >
      <video ref={videoRef} autoPlay playsInline muted className="webcam-bubble-video" />
      {status !== "live" && <div className="webcam-bubble-fallback">{status === "requesting" ? "Starting camera…" : status === "denied" ? "Camera permission required" : status === "interrupted" ? cameraNotice : "Camera unavailable"}</div>}
      {status === "live" && (
        <div className="webcam-bubble-rec"><span className="webcam-bubble-rec-dot" /> REC <span>{mins}:{secs}</span></div>
      )}
      <span className="webcam-bubble-label">You · Live</span>
      <span className="webcam-resize" onPointerDown={resize} aria-hidden="true" />
    </div>
  );
}
