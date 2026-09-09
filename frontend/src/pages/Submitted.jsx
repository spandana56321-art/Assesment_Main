import { useUser } from "../context/UserContext";
import "../styles/Submitted.css";

export default function Submitted() {
  const { user, updateUser } = useUser();

  function handleClose() {
    updateUser({
      examId: null,
      selectedDomain: null,
      questions: [],
      durationMinutes: null,
      startTime: null,
      testEndTime: null,
      examStatus: "completed",
      autoSubmitted: false,
    });

    // A normal browser tab cannot be closed by a webpage unless it was
    // opened by script. Clear the assessment session instead of calling
    // window.close(), which causes the browser console error.
    window.location.replace("/login");
  }

  return (
    <div className="assessment-card assessment-card--submitted">
      <div className="submitted-icon" aria-hidden="true">✓</div>
      <p className="eyebrow">Assessment submitted</p>
      <h1>Assessment Submitted Successfully!</h1>
      <p className="subtitle">
        Thank you for completing your assessment.
      </p>
      <p className="submitted-note">
        Your responses have been submitted successfully and are currently under review.
        We will update you regarding the next steps.
      </p>
      {user.autoSubmitted && (
        <p className="readout-note">
          Your assessment was submitted automatically when the allotted time ended.
        </p>
      )}
      <button type="button" className="btn-primary btn-block submitted-close-button" onClick={handleClose}>
        Close
      </button>
      <p className="submitted-close-hint">
        Your assessment session has been closed. You may now close this browser tab.
      </p>
    </div>
  );
}
