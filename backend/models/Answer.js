const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    // ============================================
    // EXAM
    // ============================================

    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    // ============================================
    // QUESTION
    // ============================================

    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },

    // ============================================
    // ANSWER TYPE
    // ============================================

    answerType: {
      type: String,
      enum: ["mcq", "output", "coding"],
      required: true,
    },

    // ============================================
    // MCQ / OUTPUT ANSWER
    // ============================================

    selectedOption: {
      type: String,
      enum: ["A", "B", "C", "D", null],
      default: null,
    },

    // ============================================
    // CODING ANSWER
    // ============================================

    code: {
      type: String,
      default: null,
    },

    // ============================================
    // EVALUATION
    // ============================================

    isCorrect: {
      type: Boolean,
      default: false,
    },

    // ============================================
    // CODING TEST CASE RESULTS
    // ============================================

    testCaseResults: [
      {
        testCaseId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },

        passed: {
          type: Boolean,
          default: false,
        },

        actualOutput: {
          type: String,
          default: "",
        },

        expectedOutput: {
          type: String,
          default: "",
        },

        error: {
          type: String,
          default: "",
        },
      },
    ],

    // ============================================
    // PASSED TEST CASES
    // ============================================

    passedTestCases: {
      type: Number,
      default: 0,
    },

    // ============================================
    // TOTAL TEST CASES
    // ============================================

    totalTestCases: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// ONE ANSWER PER QUESTION PER EXAM
// ============================================

answerSchema.index(
  { exam: 1, question: 1 },
  { unique: true }
);

module.exports = mongoose.model("Answer", answerSchema);