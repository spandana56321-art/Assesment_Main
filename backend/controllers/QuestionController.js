const Question = require("../models/Question");
const Domain = require("../models/Domain");

// ============================================
// CREATE QUESTION
// ============================================

const createQuestion = async (req, res) => {
  try {
    const {
      questionType,
      domain,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      language,
      starterCode,
      testCases,
      marks,
    } = req.body;

    // ========================================
    // BASIC VALIDATION
    // ========================================

    if (!questionType || !domain || !questionText) {
      return res.status(400).json({
        success: false,
        message:
          "questionType, domain and questionText are required",
      });
    }

    // ========================================
    // VALID QUESTION TYPE
    // ========================================

    if (!["mcq", "output", "coding"].includes(questionType)) {
      return res.status(400).json({
        success: false,
        message:
          "questionType must be mcq, output or coding",
      });
    }

    // ========================================
    // CHECK DOMAIN
    // ========================================

    const domainExists = await Domain.findById(domain);

    if (!domainExists) {
      return res.status(404).json({
        success: false,
        message: "Domain not found",
      });
    }

    // ========================================
    // MARKS VALIDATION
    // ========================================

    const questionMarks = Number(marks ?? 1);

    if (
      !Number.isFinite(questionMarks) ||
      questionMarks <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "marks must be a positive number",
      });
    }

    // ========================================
    // MCQ / OUTPUT VALIDATION
    // ========================================

    if (
      questionType === "mcq" ||
      questionType === "output"
    ) {
      if (
        !optionA ||
        !optionB ||
        !optionC ||
        !optionD
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All four options are required for MCQ/output questions",
        });
      }

      if (!correctOption) {
        return res.status(400).json({
          success: false,
          message:
            "correctOption is required for MCQ/output questions",
        });
      }

      if (!["A", "B", "C", "D"].includes(correctOption)) {
        return res.status(400).json({
          success: false,
          message:
            "correctOption must be A, B, C or D",
        });
      }
    }

    // ========================================
    // CODING QUESTION VALIDATION
    // ========================================

    if (questionType === "coding") {
      // Language required
      if (!language) {
        return res.status(400).json({
          success: false,
          message:
            "language is required for coding questions",
        });
      }

      // Starter code required
      if (!starterCode) {
        return res.status(400).json({
          success: false,
          message:
            "starterCode is required for coding questions",
        });
      }

      // Test cases must be an array
      if (!Array.isArray(testCases)) {
        return res.status(400).json({
          success: false,
          message:
            "testCases must be an array",
        });
      }

      // ======================================
      // EXACTLY 5 TEST CASES
      // ======================================

      if (testCases.length !== 5) {
        return res.status(400).json({
          success: false,
          message:
            "A coding question must contain exactly 5 test cases",
        });
      }

      // ======================================
      // COUNT VISIBLE / HIDDEN
      // ======================================

      const visibleCases = testCases.filter(
        (testCase) => testCase.isHidden === false
      );

      const hiddenCases = testCases.filter(
        (testCase) => testCase.isHidden === true
      );

      // Exactly 3 visible
      if (visibleCases.length !== 3) {
        return res.status(400).json({
          success: false,
          message:
            "A coding question must have exactly 3 visible test cases",
        });
      }

      // Exactly 2 hidden
      if (hiddenCases.length !== 2) {
        return res.status(400).json({
          success: false,
          message:
            "A coding question must have exactly 2 hidden test cases",
        });
      }

      // ======================================
      // VALIDATE EACH TEST CASE
      // ======================================

      for (const testCase of testCases) {
        if (
          testCase.input === undefined ||
          testCase.input === null
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Every test case must contain input",
          });
        }

        if (
          testCase.expectedOutput === undefined ||
          testCase.expectedOutput === null
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Every test case must contain expectedOutput",
          });
        }

        if (
          typeof testCase.isHidden !== "boolean"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Every test case must specify isHidden as true or false",
          });
        }
      }
    }

    // ========================================
    // CREATE QUESTION
    // ========================================

    const question = await Question.create({
      questionType,
      domain,
      questionText,

      // MCQ / OUTPUT options
      optionA:
        questionType === "coding"
          ? null
          : optionA,

      optionB:
        questionType === "coding"
          ? null
          : optionB,

      optionC:
        questionType === "coding"
          ? null
          : optionC,

      optionD:
        questionType === "coding"
          ? null
          : optionD,

      correctOption:
        questionType === "coding"
          ? null
          : correctOption,

      // Coding fields
      language:
        questionType === "coding"
          ? language
          : null,

      starterCode:
        questionType === "coding"
          ? starterCode
          : "",

      testCases:
        questionType === "coding"
          ? testCases
          : [],

      marks: questionMarks,
    });

    // ========================================
    // UPDATE DOMAIN QUESTION COUNT
    // ========================================

    domainExists.totalQuestions += 1;

    await domainExists.save();

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(201).json({
      success: true,
      message: "Question created successfully",
      question,
    });

  } catch (error) {
    console.error(
      "Create Question Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// GET QUESTIONS BY DOMAIN
// Candidate-facing endpoint
// ============================================

const getQuestionsByDomain = async (req, res) => {
  try {
    const questions = await Question.find({
      domain: req.params.domainId,
    })
      // Never expose answer key or test cases
      .select("-correctOption -testCases")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });

  } catch (error) {
    console.error(
      "Get Questions Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createQuestion,
  getQuestionsByDomain,
};