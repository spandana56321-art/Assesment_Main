import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { api } from "../services/api";
import { saveAssessmentRecording } from "../services/localMediaStore";
import CodeRunner from "../components/CodeRunner";
import ProctorGuard from "../components/ProctorGuard";
import "../styles/Quiz.css";

const KEYS = ["A", "B", "C", "D"];

function calculateEndTime(startTime, durationMinutes, backendEndTime) {
  if (backendEndTime) {
    const end = new Date(backendEndTime).getTime();
    if (!Number.isNaN(end)) return end;
  }
  const start = new Date(startTime).getTime();
  const duration = Number(durationMinutes) * 60 * 1000;
  if (Number.isNaN(start) || !Number.isFinite(duration)) return null;
  return start + duration;
}

function buildAnswersFromBackend(backendAnswers = [], questions = []) {
  const restored = {};
  if (!Array.isArray(backendAnswers)) return restored;

  backendAnswers.forEach((answer) => {
    if (!answer?.questionId) return;
    const questionId = String(answer.questionId);
    const question = questions.find((q) => String(q._id) === questionId);
    if (!question) return;

    restored[questionId] = {
      questionId: question._id,
      answerType: answer.answerType || question.questionType,
      selectedOption: answer.selectedOption ?? null,
      code:
        answer.code ??
        (question.questionType === "coding" ? question.starterCode || "" : null),
      testResults: null,
    };
  });

  return restored;
}

function isAnswered(question, answer) {
  if (!question || !answer) return false;

  if (question.questionType === "mcq" || question.questionType === "output") {
    return answer.selectedOption !== null && answer.selectedOption !== undefined;
  }

  if (question.questionType === "coding") {
    const code = String(answer.code || "").trim();
    const starterCode = String(question.starterCode || "").trim();
    return code !== "" && code !== starterCode;
  }

  return false;
}

function buildAnswerPayload(examId, question, answer) {
  if (!question || !answer) return null;

  if (question.questionType === "mcq" || question.questionType === "output") {
    return {
      examId,
      questionId: question._id,
      answerType: question.questionType,
      selectedOption: answer.selectedOption,
    };
  }

  if (question.questionType === "coding") {
    return {
      examId,
      questionId: question._id,
      answerType: "coding",
      code: answer.code,
    };
  }

  return null;
}

export default function Quiz() {
  const { user, updateUser, registerTimeUpHandler } = useUser();
  const navigate = useNavigate();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(user?.answers || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [mandatoryAlert, setMandatoryAlert] = useState("");

  const hasSubmittedRef = useRef(false);
  const activeExamLoadedRef = useRef(false);

  const list = Array.isArray(user.questions) ? user.questions : [];
  const current = list[index];
  const currentAnswer = current ? answers[current._id] : null;
  const isLast = list.length > 0 && index === list.length - 1;

  // Load / restore exam session
  useEffect(() => {
    let cancelled = false;

    async function loadExam() {
      if (!user.token) {
        navigate("/", { replace: true });
        return;
      }

      // Session already present in frontend state
      if (user.examId && Array.isArray(user.questions) && user.questions.length > 0) {
        const endTime = calculateEndTime(user.startTime, user.durationMinutes, user.endTime);
        if (endTime) updateUser({ testEndTime: endTime });

        setAnswers(user.answers || {});
        setLoading(false);
        activeExamLoadedRef.current = true;
        return;
      }

      if (activeExamLoadedRef.current) return;
      activeExamLoadedRef.current = true;

      try {
        setLoading(true);
        setError("");

        const activeExam = await api.getActiveExam(user.token);

        if (!activeExam?.success || !activeExam.examId) {
          throw new Error(activeExam?.message || "Unable to restore your active assessment.");
        }

        const questions = Array.isArray(activeExam.questions) ? activeExam.questions : [];
        if (questions.length === 0) {
          throw new Error("Your active assessment has no questions.");
        }

        const restoredAnswers = buildAnswersFromBackend(activeExam.answers || [], questions);

        const endTime = calculateEndTime(
          activeExam.startTime,
          activeExam.durationMinutes,
          activeExam.endTime
        );
        if (!endTime) throw new Error("Invalid exam timing received from server.");

        if (!cancelled) {
          updateUser({
            examId: activeExam.examId,
            selectedDomain: activeExam.domain || null,
            domain: activeExam.domain?._id || user.domain || null,
            domainId: activeExam.domain?._id || user.domainId || null,
            questions,
            answers: restoredAnswers,
            durationMinutes: activeExam.durationMinutes,
            startTime: activeExam.startTime,
            endTime: activeExam.endTime || null,
            testEndTime: endTime,
            examStatus: activeExam.status || "in_progress",
            totalMarks: activeExam.totalMarks || 0,
          });

          setAnswers(restoredAnswers);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;

        console.error("Restore active exam error:", err);
        // Do NOT blindly redirect home — an active exam may still exist server-side
        // even if frontend state was lost.
        setError(err.message || "Unable to restore your assessment.");
        setLoading(false);
      }
    }

    loadExam();
    return () => {
      cancelled = true;
    };
  }, [
    user.token,
    user.examId,
    user.questions,
    user.startTime,
    user.durationMinutes,
    user.endTime,
    user.answers,
    user.domain,
    user.domainId,
    navigate,
    updateUser,
  ]);

  // Persist answers to user context
  useEffect(() => {
    updateUser({ answers });
  }, [answers, updateUser]);

  // Seed a blank answer entry when the current question changes
  useEffect(() => {
    if (!current) return;
    setMandatoryAlert("");

    setAnswers((prev) => {
      if (prev[current._id]) return prev;

      const isCoding = current.questionType === "coding";
      return {
        ...prev,
        [current._id]: {
          questionId: current._id,
          answerType: isCoding ? "coding" : current.questionType,
          selectedOption: null,
          code: isCoding ? current.starterCode || "" : null,
          testResults: null,
        },
      };
    });
  }, [current]);

  function selectOption(option) {
    if (!current || submitting || savingAnswer) return;

    setAnswers((prev) => ({
      ...prev,
      [current._id]: {
        ...prev[current._id],
        questionId: current._id,
        answerType: current.questionType,
        selectedOption: option,
        code: null,
        testResults: null,
      },
    }));

    setMandatoryAlert("");
    setError("");
  }

  function setCode(value) {
    if (!current || submitting || savingAnswer) return;

    setAnswers((prev) => ({
      ...prev,
      [current._id]: {
        ...prev[current._id],
        questionId: current._id,
        answerType: "coding",
        selectedOption: null,
        code: value,
        testResults: null,
      },
    }));

    setMandatoryAlert("");
    setError("");
  }

  function setCodeResults(results) {
    if (!current) return;

    setAnswers((prev) => ({
      ...prev,
      [current._id]: {
        ...prev[current._id],
        questionId: current._id,
        answerType: "coding",
        selectedOption: null,
        code: prev[current._id]?.code || current.starterCode || "",
        testResults: results,
      },
    }));

    setMandatoryAlert("");
  }

  async function submitCurrentAnswer({ allowUnanswered = false } = {}) {
    if (!current) return null;

    const answer = answers[current._id];
    const answered = isAnswered(current, answer);

    if (!answered) {
      if (allowUnanswered) return null;
      throw new Error("Please answer this question before continuing.");
    }

    const payload = buildAnswerPayload(user.examId, current, answer);
    if (!payload) throw new Error("Unsupported question type.");

    setSavingAnswer(true);
    try {
      return await api.submitAnswer(payload, user.token);
    } finally {
      setSavingAnswer(false);
    }
  }

  const finishExam = useCallback(
    async ({ auto = false, skipCurrentAnswer = false } = {}) => {
      if (hasSubmittedRef.current) return;
      hasSubmittedRef.current = true;

      setSubmitting(true);
      setError("");

      try {
        if (current && !skipCurrentAnswer) {
          try {
            await submitCurrentAnswer({ allowUnanswered: auto });
          } catch (err) {
            // Automatic submission should not fail just because the
            // current question was left unanswered.
            if (!auto) throw err;
            console.warn("Current question was not answered:", err.message);
          }
        }

        // Stop the live recorder before leaving the assessment. The recording
        // is intentionally stored in this browser's IndexedDB instead of the backend.
        const recordingPromise = window.__stopAssessmentRecording
          ? window.__stopAssessmentRecording()
          : Promise.resolve(null);

        const result = await api.finishExam(user.token, user.examId);
        const recordingBlob = await recordingPromise;

        if (recordingBlob?.size) {
          try {
            await saveAssessmentRecording(user.examId, recordingBlob);
          } catch (recordingError) {
            console.warn("Local recording save failed:", recordingError);
          }
        }

        updateUser({
          score: result.score ?? 0,
          totalMarks: result.totalMarks ?? user.totalMarks ?? 0,
          autoSubmitted: auto,
          examStatus: "completed",
        });

        navigate("/submitted", { replace: true });
      } catch (err) {
        console.error("Finish exam error:", err);
        setError(err.message || "Unable to submit the assessment.");
        setSubmitting(false);
        hasSubmittedRef.current = false;
      }
    },
    [current, user.token, user.examId, user.totalMarks, updateUser, navigate]
  );

  const handleTimeUp = useCallback(() => {
    finishExam({ auto: true });
  }, [finishExam]);

  const handleIntegrityViolation = useCallback(
    (event, count) => {
      if (count >= 3) {
        finishExam({ auto: true, skipCurrentAnswer: false });
      }
    },
    [finishExam]
  );

  useEffect(() => {
    registerTimeUpHandler(handleTimeUp);
    return () => registerTimeUpHandler(null);
  }, [registerTimeUpHandler, handleTimeUp]);

  async function goNext() {
    if (submitting || savingAnswer || !current) return;

    setMandatoryAlert("");
    setError("");

    try {
      if (isLast) {
        await submitCurrentAnswer();
        await finishExam({ auto: false, skipCurrentAnswer: true });
        return;
      }

      await submitCurrentAnswer();
      setIndex((prev) => prev + 1);
    } catch (err) {
      console.error("Next question error:", err);
      setMandatoryAlert(err.message || "Please answer this question before continuing.");
    }
  }

  function goPrev() {
    if (index === 0 || submitting || savingAnswer) return;
    setMandatoryAlert("");
    setIndex((prev) => prev - 1);
  }

  if (loading) {
    return (
      <div className="assessment-card">
        <p className="loading-text">Restoring your assessment...</p>
      </div>
    );
  }

  if (!user.token) return null;

  if (error && !current) {
    return (
      <div className="assessment-card">
        <p className="form-error">{error}</p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate("/domains", { replace: true })}
        >
          Back to assessments
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="assessment-card">
        <p className="form-error">No question available.</p>
      </div>
    );
  }

  function renderOptions() {
    const options = [current.optionA, current.optionB, current.optionC, current.optionD];

    return (
      <div className="options">
        {options.map((option, i) => {
          if (!option) return null;
          const key = KEYS[i];

          return (
            <button
              key={key}
              type="button"
              className={`option ${currentAnswer?.selectedOption === key ? "option--selected" : ""}`}
              onClick={() => selectOption(key)}
              disabled={submitting || savingAnswer}
            >
              <span className="option-key">{key}</span>
              <span className="option-text">{option}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderCoding() {
    // Only visible test cases are rendered — hidden cases never reach the UI.
    const visibleTestCases = Array.isArray(current.testCases)
      ? current.testCases.filter((tc) => tc?.isHidden !== true)
      : [];

    return (
      <div className="split-layout">
        <div className="split-left">
          <p className="question">{current.questionText}</p>

          <div className="coding-info">
            <span>Language:</span>
            <strong>{current.language || "javascript"}</strong>
          </div>

          {visibleTestCases.length > 0 && (
            <div className="test-cases">
              <h3>Sample Test Cases</h3>
              {visibleTestCases.map((testCase, i) => (
                <div className="test-case" key={testCase._id || i}>
                  <strong>Test Case {i + 1}</strong>
                  <p>
                    Input: <code>{testCase.input}</code>
                  </p>
                  <p>
                    Expected: <code>{testCase.expectedOutput}</code>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="split-right">
          <CodeRunner
            key={current._id}
            code={currentAnswer?.code ?? current.starterCode ?? ""}
            onCodeChange={setCode}
            testCases={visibleTestCases}
            mode={current.language || "javascript"}
            onResults={setCodeResults}
            disabled={submitting || savingAnswer}
            initialResults={currentAnswer?.testResults || null}
          />
        </div>
      </div>
    );
  }

  const isCoding = current.questionType === "coding";
  const isMcq = current.questionType === "mcq" || current.questionType === "output";

  return (
    <div className="quiz-page">
      <ProctorGuard
        examId={user.examId}
        onViolation={handleIntegrityViolation}
      />

      <div className="quiz-layout">
        <aside className="quiz-sidebar">
          <div className="quiz-sidebar-head">
            <span className="quiz-sidebar-label">Assessment</span>
            <strong>{user.selectedDomain?.name || "Technical assessment"}</strong>
            <span>{list.length} questions · {user.durationMinutes || 30} min</span>
          </div>

          <div className="quiz-progress-copy">
            <span>Your progress</span>
            <strong>{Math.round(((index + 1) / list.length) * 100)}%</strong>
          </div>

          <div className="quiz-mini-progress">
            <span style={{ width: `${((index + 1) / list.length) * 100}%` }} />
          </div>

          <div className="question-palette">
            {list.map((question, i) => {
              const answered = isAnswered(question, answers[question._id]);
              const active = i === index;
              return (
                <button
                  key={question._id || i}
                  type="button"
                  className={`palette-item ${active ? "palette-item--active" : ""} ${answered ? "palette-item--answered" : ""}`}
                  onClick={() => {
                    if (!submitting && !savingAnswer) {
                      setMandatoryAlert("");
                      setIndex(i);
                    }
                  }}
                  disabled={submitting || savingAnswer}
                  aria-label={`Question ${i + 1}${answered ? ", answered" : ", unanswered"}`}
                >
                  {answered ? "✓" : i + 1}
                </button>
              );
            })}
          </div>

          <div className="palette-legend">
            <span><i className="legend-dot legend-dot--answered" /> Answered</span>
            <span><i className="legend-dot" /> Unanswered</span>
          </div>

          <div className="quiz-sidebar-note">
            <span className="shield-icon">✓</span>
            <div>
              <strong>Secure assessment</strong>
              <p>Stay in full screen and keep your camera enabled.</p>
            </div>
          </div>
        </aside>

        <section className={`assessment-card quiz-card ${isCoding ? "assessment-card--wide" : ""}`}>
          <div className="quiz-top">
            <div>
              <span className="question-kicker">Question {index + 1}</span>
              <div className="quiz-meta">
                <span>of {list.length}</span>
                <span className="type-pill">
                  {current.questionType === "coding"
                    ? "Coding"
                    : current.questionType === "output"
                      ? "Output"
                      : "MCQ"}
                </span>
                <span className="marks-pill">
                  {current.marks || 1} {current.marks === 1 ? "mark" : "marks"}
                </span>
              </div>
            </div>
            <span className="quiz-save-state">
              <span className="save-dot" />
              {savingAnswer ? "Saving" : "Saved"}
            </span>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((index + 1) / list.length) * 100}%` }}
            />
          </div>

          {isCoding ? (
            renderCoding()
          ) : (
            <>
              <p className="question">{current.questionText}</p>
              {current.code && (
                <pre className="code-block">
                  <code>{current.code}</code>
                </pre>
              )}
              {isMcq && renderOptions()}
            </>
          )}

          {mandatoryAlert && (
            <div className="mandatory-alert" role="alert">
              <span className="mandatory-alert-icon" aria-hidden="true">!</span>
              <span>{mandatoryAlert}</span>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="quiz-nav">
            <button
              type="button"
              className="nav-btn nav-btn--prev"
              disabled={index === 0 || submitting || savingAnswer}
              onClick={goPrev}
            >
              <span className="nav-btn-arrow" aria-hidden="true">←</span>
              Previous
            </button>

            <button
              type="button"
              className={`nav-btn nav-btn--next ${isLast ? "nav-btn--finish" : ""}`}
              disabled={submitting || savingAnswer}
              onClick={goNext}
            >
              {submitting ? "Submitting..." : savingAnswer ? "Saving..." : isLast ? "Finish assessment" : "Next question"}
              {!submitting && !savingAnswer && !isLast && (
                <span className="nav-btn-arrow" aria-hidden="true">→</span>
              )}
              {!submitting && !savingAnswer && isLast && (
                <span className="nav-btn-arrow" aria-hidden="true">✓</span>
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
