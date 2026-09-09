import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { api } from "../services/api";
import "../styles/Domains.css";

export default function Domains() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();


  // ============================================================
  // STATE
  // ============================================================

  const [domains, setDomains] = useState([]);

  const [loading, setLoading] = useState(true);

  const [checkingActiveExam, setCheckingActiveExam] =
    useState(true);

  const [startingExam, setStartingExam] =
    useState(false);

  const [resumingExam, setResumingExam] =
    useState(false);

  const [selectedDomainId, setSelectedDomainId] =
    useState(null);

  const [activeExam, setActiveExam] =
    useState(null);

  const [error, setError] = useState("");

  // ============================================================
  // LOAD PAGE
  // ============================================================

  useEffect(() => {
    if (!user.token) {
      navigate("/", { replace: true });
      return;
    }

    if (!user.isTermsAccepted) {
      navigate("/terms", { replace: true });
      return;
    }

    checkActiveExam();
  }, [
    user.token,
    user.isTermsAccepted,
    navigate,
  ]);

  // ============================================================
  // CHECK ACTIVE EXAM
  // ============================================================

  async function checkActiveExam() {
    try {
      setCheckingActiveExam(true);
      setLoading(true);
      setError("");

      console.log(
        "Checking for active exam..."
      );

      const active =
        await api.getActiveExam(
          user.token
        );

      console.log(
        "Active exam response:",
        active
      );

      // ========================================================
      // NO ACTIVE EXAM
      // ========================================================

      if (
        !active?.success ||
        !active?.examId
      ) {
        console.log(
          "No active exam. Loading domains..."
        );

        setActiveExam(null);

        await loadDomains();

        return;
      }

      // ========================================================
      // ACTIVE EXAM FOUND
      // ========================================================

      setActiveExam(active);

      console.log(
        "Active exam found:",
        active.examId
      );

    } catch (err) {
      console.error(
        "Check active exam response:",
        err
      );

      const message =
        err?.message?.toLowerCase() || "";

      // ========================================================
      // NO ACTIVE EXAM
      //
      // Backend currently returns 404 when there is no active
      // exam. This is a normal state, not a frontend error.
      // ========================================================

      if (
        message.includes(
          "no active exam"
        ) ||
        message.includes(
          "active exam not found"
        ) ||
        message.includes(
          "exam not found"
        )
      ) {
        console.log(
          "No active exam found. Loading domains..."
        );

        setActiveExam(null);
        setError("");

        await loadDomains();

        return;
      }

      // ========================================================
      // EXPIRED EXAM
      // ========================================================

      if (
        message.includes("expired")
      ) {
        console.log(
          "Previous exam expired."
        );

        setActiveExam(null);

        setError(
          "Your previous assessment has expired. You can start a new assessment."
        );

        await loadDomains();

        return;
      }

      // ========================================================
      // OTHER ERROR
      // ========================================================

      setActiveExam(null);

      setError(
        err?.message ||
        "Unable to check your active assessment."
      );

      // Try loading domains even if active-exam
      // checking fails.
      await loadDomains();

    } finally {
      setCheckingActiveExam(false);
      setLoading(false);
    }
  }

  // ============================================================
  // LOAD DOMAINS
  // ============================================================

  async function loadDomains() {
    try {
      setLoading(true);

      setError("");

      console.log(
        "Loading available domains..."
      );

      const data =
        await api.getDomains(
          user.token
        );

      console.log(
        "Domains response:",
        data
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
          "Failed to load domains."
        );
      }

      setDomains(
        Array.isArray(data.domains)
          ? data.domains
          : []
      );

    } catch (err) {
      console.error(
        "Get domains error:",
        err
      );

      setError(
        err?.message ||
        "Failed to load available domains."
      );

    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // BUILD EXAM STATE
  // ============================================================

  function buildExamState(exam) {
    if (!exam?.examId) {
      throw new Error(
        "Invalid active exam received from server."
      );
    }

    if (!exam?.startTime) {
      throw new Error(
        "Active exam has no valid start time."
      );
    }

    if (
      !Array.isArray(
        exam.questions
      ) ||
      exam.questions.length === 0
    ) {
      throw new Error(
        "No questions were found for the active assessment."
      );
    }

    // ==========================================================
    // SERVER START TIME
    // ==========================================================

    const startTimeMs =
      new Date(
        exam.startTime
      ).getTime();

    if (
      Number.isNaN(startTimeMs)
    ) {
      throw new Error(
        "Invalid exam start time."
      );
    }

    // ==========================================================
    // DURATION
    // ==========================================================

    const durationMinutes =
      Number(
        exam.durationMinutes || 30
      );

    if (
      !durationMinutes ||
      durationMinutes <= 0
    ) {
      throw new Error(
        "Invalid exam duration."
      );
    }

    // ==========================================================
    // CALCULATE END TIME
    // ==========================================================

    const testEndTime =
      startTimeMs +
      durationMinutes *
      60 *
      1000;

    // ==========================================================
    // DOMAIN
    // ==========================================================

    const domain =
      exam.domain ||
      activeExam?.domain ||
      null;

    // ==========================================================
    // TOTAL MARKS
    // ==========================================================

    const totalMarks =
      exam.questions.reduce(
        (total, question) => {
          return (
            total +
            Number(
              question?.marks || 0
            )
          );
        },
        0
      );

    // ==========================================================
    // RETURN COMPLETE EXAM STATE
    // ==========================================================

    return {
      token: user.token,

      // Candidate/domain
      domain:
        domain?._id ||
        domain?.id ||
        null,

      domainId:
        domain?._id ||
        domain?.id ||
        null,

      selectedDomain:
        domain,

      // Exam
      examId:
        exam.examId,

      examStatus:
        exam.status ||
        "in_progress",

      // Questions
      questions:
        exam.questions,

      // Timing
      durationMinutes,

      startTime:
        exam.startTime,

      testEndTime,

      // Result
      score:
        Number(
          exam.score || 0
        ),

      totalMarks,

      // Submission state
      autoSubmitted: false,

      // Existing answers
      answers:
        Array.isArray(
          exam.answers
        )
          ? exam.answers
          : [],
    };
  }

  // ============================================================
  // RESUME ACTIVE EXAM
  // ============================================================

  async function resumeExam() {
    if (
      resumingExam ||
      !activeExam
    ) {
      return;
    }

    try {
      setResumingExam(true);

      setError("");

      console.log(
        "Resuming active exam:",
        activeExam.examId
      );

      // ========================================================
      // BUILD EXAM STATE
      // ========================================================

      const examState =
        buildExamState(
          activeExam
        );

      // ========================================================
      // CHECK TIMER
      // ========================================================

      if (
        examState.testEndTime <=
        Date.now()
      ) {
        console.log(
          "Active exam timer has expired."
        );

        setActiveExam(null);

        setError(
          "Your previous assessment has expired. You can start a new assessment."
        );

        await loadDomains();

        return;
      }

      // ========================================================
      // RESTORE SESSION
      // ========================================================

      updateUser(
        examState
      );

      console.log(
        "Active exam restored successfully."
      );

      // ========================================================
      // GO BACK TO QUIZ
      // ========================================================

      navigate(
        "/quiz",
        {
          replace: true,
        }
      );

    } catch (err) {
      console.error(
        "Resume exam error:",
        err
      );

      setError(
        err?.message ||
        "Unable to resume your assessment."
      );

    } finally {
      setResumingExam(false);
    }
  }

  // ============================================================
  // PICK DOMAIN — GO TO IDENTITY VERIFICATION
  // ============================================================
  //
  // NOTE: This no longer calls api.startExam() directly. The
  // exam (and its server-side timer) is only started AFTER the
  // candidate completes the webcam photo + ID upload step on the
  // /verify screen, so verification time doesn't eat into the
  // assessment duration.
  // ============================================================

  function pick(domain) {
    if (
      startingExam ||
      resumingExam ||
      activeExam ||
      !domain?._id
    ) {
      return;
    }

    setError("");

    console.log(
      "Domain selected, going to identity verification:",
      domain._id
    );

    navigate("/verify", {
      state: { domain },
    });
  }

  // ============================================================
  // AUTH GUARD
  // ============================================================

  if (
    !user.token ||
    !user.isTermsAccepted
  ) {
    return null;
  }

  // ============================================================
  // ACTIVE EXAM SCREEN
  // ============================================================

  if (
    !checkingActiveExam &&
    activeExam
  ) {
    const activeDomain =
      activeExam.domain;

    return (
      <div className="assessment-card">

        <p className="eyebrow">
          Active assessment
        </p>

        <h1>
          Resume your assessment
        </h1>

        <p className="subtitle">
          You already have an assessment
          in progress. You cannot start
          another assessment until this
          one is completed.
        </p>

        <div className="domain-grid">

          <div className="domain-card">

            <span className="domain-name">
              {activeDomain?.name ||
                "Current assessment"}
            </span>

            <span className="domain-description">
              Your previous assessment
              is still active.
            </span>

            <span className="domain-details">
              {activeExam.questions?.length ||
                0}{" "}
              Questions
              {" • "}
              {activeExam.durationMinutes ||
                30}{" "}
              Minutes
            </span>

            <button
              type="button"
              className="btn-primary btn-block"
              onClick={
                resumeExam
              }
              disabled={
                resumingExam
              }
            >
              {resumingExam
                ? "Resuming assessment..."
                : "Resume assessment"}
            </button>

          </div>

        </div>

        {error && (
          <p className="form-error">
            {error}
          </p>
        )}

      </div>
    );
  }

  // ============================================================
  // NORMAL DOMAIN SCREEN
  // ============================================================

  return (
    <div className="assessment-card">

      <p className="eyebrow">
        Step 3 of 5
      </p>

      <h1>
        Choose your track
      </h1>

      <p className="subtitle">
        Choose the technical domain you
        want to take the assessment for.
        The assessment duration is
        determined by the selected domain.
      </p>

      {/* ========================================================
          LOADING
      ======================================================== */}

      {(loading ||
        checkingActiveExam) && (
          <p className="loading-text">
            Checking assessment status...
          </p>
        )}

      {/* ========================================================
          ERROR
      ======================================================== */}

      {error && (
        <p className="form-error">
          {error}
        </p>
      )}

      {/* ========================================================
          EMPTY DOMAINS
      ======================================================== */}

      {!loading &&
        !checkingActiveExam &&
        !error &&
        domains.length === 0 && (
          <p className="loading-text">
            No assessment domains are
            available right now.
          </p>
        )}

      {/* ========================================================
          DOMAIN GRID
      ======================================================== */}

      {!loading &&
        !checkingActiveExam &&
        domains.length > 0 && (
          <div className="domain-grid">

            {domains.map(
              (domain) => {

                const isStartingThisDomain =
                  startingExam &&
                  selectedDomainId ===
                  domain._id;

                return (
                  <button
                    key={domain._id}
                    type="button"
                    className="domain-card"
                    onClick={() =>
                      pick(domain)
                    }
                    disabled={
                      startingExam ||
                      resumingExam
                    }
                  >

                    {/* DOMAIN NAME */}

                    <span className="domain-name">
                      {domain.name}
                    </span>

                    {/* DESCRIPTION */}

                    <span className="domain-description">
                      {domain.description ||
                        "Technical assessment"}
                    </span>

                    {/* DETAILS */}

                    <span className="domain-details">
                      {domain.totalQuestions ||
                        0}{" "}
                      Questions
                      {" • "}
                      {domain.durationMinutes ||
                        30}{" "}
                      Minutes
                    </span>

                    {/* STARTING */}

                    {isStartingThisDomain && (
                      <span className="domain-loading">
                        Starting assessment...
                      </span>
                    )}

                  </button>
                );
              }
            )}

          </div>
        )}

    </div>
  );
}