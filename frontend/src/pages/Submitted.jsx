import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "./Submitted.css";

export default function Submitted() {
  const { user } = useUser();
  const navigate = useNavigate();

  function handleViewResult() {
    navigate("/result");
  }

  return (
    <div className="assessment-card assessment-card--submitted">
      <div className="submitted-icon" aria-hidden="true">
        ✓
      </div>

      <p className="eyebrow">
        Assessment complete
      </p>

      <h1>
        Thank you,{" "}
        {user.name?.split(" ")[0] || "there"}!
      </h1>

      <p className="subtitle">
        Your assessment has been submitted successfully.
      </p>

      {user.autoSubmitted && (
        <p className="readout-note">
          Time was up, so your answers were submitted
          automatically.
        </p>
      )}

      <p className="submitted-note">
        Your answers have been recorded and evaluated
        by the server.
      </p>

      <button
        type="button"
        className="btn-primary btn-block"
        onClick={handleViewResult}
      >
        Continue
      </button>
    </div>
  );
}