import { useRef, useState } from "react";

// ============================================================
// NORMALIZE OUTPUT
// ============================================================

function normalizeOutput(value) {
  return String(value ?? "")
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "");
}

// ============================================================
// BUILD SANDBOX HARNESS
// ============================================================

function buildHarness(candidateCode, testCases) {
  const encodedCode = JSON.stringify(candidateCode || "");

  const encodedTests = JSON.stringify(
    testCases.map((testCase) => ({
      input: String(testCase.input ?? ""),
      expectedOutput: String(
        testCase.expectedOutput ?? ""
      ),
    }))
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>

<body>

<script>
(async function () {

  const candidateCode = ${encodedCode};

  const testCases = ${encodedTests};

  // ========================================================
  // OUTPUT NORMALIZATION
  // ========================================================

  function normalizeOutput(value) {
    return String(value ?? "")
      .trim()
      .replace(/\\r\\n/g, "\\n")
      .replace(/[ \\t]+$/gm, "");
  }

  try {

    // ======================================================
    // CREATE CANDIDATE FUNCTION
    // ======================================================

    /*
      Candidate must define:

      function solve(a, b) {
        return a + b;
      }
    */

    const factory = new Function(
      candidateCode + "\\nreturn solve;"
    );

    const solve = factory();

    // ======================================================
    // VALIDATE SOLVE FUNCTION
    // ======================================================

    if (typeof solve !== "function") {
      throw new Error(
        "Your code must define a solve(a, b) function."
      );
    }

    // ======================================================
    // RUN TEST CASES
    // ======================================================

    const results = [];

    for (let i = 0; i < testCases.length; i++) {

      const testCase = testCases[i];

      try {

        // ----------------------------------------------
        // Convert input into arguments
        // ----------------------------------------------

        const input = testCase.input
          .trim()
          .split(/\\s+/)
          .filter(Boolean);

        const args = input.map((value) => {

          const number = Number(value);

          return Number.isNaN(number)
            ? value
            : number;
        });

        // ----------------------------------------------
        // Execute candidate solution
        // ----------------------------------------------

        const actualOutput = await solve(...args);

        // ----------------------------------------------
        // Normalize output
        // ----------------------------------------------

        const actual = normalizeOutput(
          actualOutput
        );

        const expected = normalizeOutput(
          testCase.expectedOutput
        );

        // ----------------------------------------------
        // Compare
        // ----------------------------------------------

        results.push({
          index: i,
          passed: actual === expected,
          actualOutput: actual,
          expectedOutput: expected,
          error: ""
        });

      } catch (error) {

        results.push({
          index: i,
          passed: false,
          actualOutput: "",
          expectedOutput:
            testCase.expectedOutput,
          error:
            error?.message ||
            "Test case failed"
        });
      }
    }

    // ======================================================
    // SEND RESULTS TO PARENT WINDOW
    // ======================================================

    parent.postMessage(
      {
        type: "results",
        results
      },
      "*"
    );

  } catch (error) {

    // ======================================================
    // RUNTIME / SYNTAX ERROR
    // ======================================================

    parent.postMessage(
      {
        type: "runtime-error",
        message:
          error?.message ||
          "Code execution failed"
      },
      "*"
    );
  }

})();
</script>

</body>
</html>
`;
}

// ============================================================
// CODE RUNNER COMPONENT
// ============================================================

export default function CodeRunner({
  code,
  onCodeChange,
  testCases = [],
  onResults,
  disabled = false,
  initialResults = null,
}) {
  const [running, setRunning] =
    useState(false);

  const [results, setResults] =
    useState(initialResults);

  const [runtimeError, setRuntimeError] =
    useState(null);

  const cleanupRef =
    useRef(null);

  // ==========================================================
  // RUN CODE
  // ==========================================================

  function run() {

    if (running || disabled) {
      return;
    }

    // --------------------------------------------------------
    // Cleanup previous iframe
    // --------------------------------------------------------

    if (cleanupRef.current) {
      cleanupRef.current();
    }

    setRunning(true);
    setResults(null);
    setRuntimeError(null);

    // ========================================================
    // ONLY VISIBLE TEST CASES
    // ========================================================

    const visibleTestCases =
      testCases.filter(
        (testCase) =>
          testCase?.isHidden !== true
      );

    if (visibleTestCases.length === 0) {

      setRuntimeError(
        "No visible test cases available."
      );

      setRunning(false);

      return;
    }

    // ========================================================
    // CREATE SANDBOXED IFRAME
    // ========================================================

    const iframe =
      document.createElement("iframe");

    iframe.setAttribute(
      "sandbox",
      "allow-scripts"
    );

    iframe.style.display = "none";

    iframe.srcdoc = buildHarness(
      code,
      visibleTestCases
    );

    let finished = false;

    // ========================================================
    // CLEANUP
    // ========================================================

    function cleanup() {

      if (finished) {
        return;
      }

      finished = true;

      window.removeEventListener(
        "message",
        handleMessage
      );

      clearTimeout(timeoutId);

      setRunning(false);

      setTimeout(() => {
        iframe.remove();
      }, 50);

      cleanupRef.current = null;
    }

    // ========================================================
    // HANDLE IFRAME MESSAGE
    // ========================================================

    function handleMessage(event) {

      // Only accept messages from our iframe
      if (
        event.source !==
        iframe.contentWindow
      ) {
        return;
      }

      // ------------------------------------------------------
      // Runtime error
      // ------------------------------------------------------

      if (
        event.data?.type ===
        "runtime-error"
      ) {

        setRuntimeError(
          event.data.message
        );

        setResults(null);

        onResults?.(null);

        cleanup();

        return;
      }

      // ------------------------------------------------------
      // Test results
      // ------------------------------------------------------

      if (
        event.data?.type ===
        "results"
      ) {

        const receivedResults =
          Array.isArray(
            event.data.results
          )
            ? event.data.results
            : [];

        setResults(
          receivedResults
        );

        onResults?.(
          receivedResults
        );

        cleanup();
      }
    }

    // ========================================================
    // TIMEOUT
    // ========================================================

    const timeoutId =
      setTimeout(() => {

        setRuntimeError(
          "Execution timed out. Check your code."
        );

        setResults(null);

        onResults?.(null);

        cleanup();

      }, 4000);

    // ========================================================
    // REGISTER CLEANUP
    // ========================================================

    cleanupRef.current =
      cleanup;

    // ========================================================
    // LISTEN FOR RESULTS
    // ========================================================

    window.addEventListener(
      "message",
      handleMessage
    );

    // ========================================================
    // START IFRAME
    // ========================================================

    document.body.appendChild(
      iframe
    );
  }

  // ==========================================================
  // RESULT COUNTS
  // ==========================================================

  const passCount =
    Array.isArray(results)
      ? results.filter(
          (result) =>
            result?.passed
        ).length
      : 0;

  const totalTests =
    Array.isArray(results)
      ? results.length
      : testCases.filter(
          (testCase) =>
            testCase?.isHidden !== true
        ).length;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="code-runner">

      {/* ====================================================
          CODE EDITOR
      ==================================================== */}

      <textarea
        className="code-input code-input--editor"
        spellCheck={false}
        value={code}
        onChange={(e) =>
          onCodeChange(
            e.target.value
          )
        }
        disabled={disabled}
      />

      {/* ====================================================
          RUN BAR
      ==================================================== */}

      <div className="code-runner-bar">

        <button
          type="button"
          className="btn-run"
          onClick={run}
          disabled={
            running ||
            disabled
          }
        >
          {running
            ? "Running..."
            : "▶ Run"}
        </button>

        {/* ==================================================
            RESULT SUMMARY
        ================================================== */}

        {results && (
          <span
            className={`code-runner-summary ${
              passCount === totalTests
                ? "is-pass"
                : "is-fail"
            }`}
          >
            Tests: {passCount} pass /{" "}
            {totalTests - passCount} fail
          </span>
        )}

      </div>

      {/* ====================================================
          RUNTIME ERROR
      ==================================================== */}

      {runtimeError && (
        <div className="code-runner-error">
          {runtimeError}
        </div>
      )}

      {/* ====================================================
          INITIAL HINT
      ==================================================== */}

      {!results &&
        !runtimeError && (
          <p className="code-runner-hint">
            Click Run to test your code
            against the visible test cases.
          </p>
        )}

      {/* ====================================================
          TEST RESULTS
      ==================================================== */}

      {results && (
        <ul className="test-results">

          {results.map(
            (result, index) => (

              <li
                key={index}
                className={
                  result.passed
                    ? "test-pass"
                    : "test-fail"
                }
              >

                {/* ----------------------------------------
                    PASS / FAIL ICON
                ----------------------------------------- */}

                <span
                  className="test-icon"
                  aria-hidden="true"
                >
                  {result.passed
                    ? "✓"
                    : "✕"}
                </span>

                {/* ----------------------------------------
                    TEST CASE LABEL
                ----------------------------------------- */}

                <span>
                  Test Case{" "}
                  {index + 1}
                </span>

                {/* ----------------------------------------
                    ERROR
                ----------------------------------------- */}

                {result.error && (
                  <span className="test-error">
                    {" — "}
                    {result.error}
                  </span>
                )}

                {/* ----------------------------------------
                    WRONG OUTPUT
                ----------------------------------------- */}

                {!result.error &&
                  !result.passed && (
                    <span className="test-error">
                      {" — Expected: "}
                      {result.expectedOutput}

                      {result.actualOutput &&
                        `, Received: ${result.actualOutput}`}
                    </span>
                  )}

              </li>

            )
          )}

        </ul>
      )}

    </div>
  );
}