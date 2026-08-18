const mongoose = require("mongoose");

// ============================================
// TEST CASE SCHEMA
// ============================================

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: true,
      trim: true,
    },

    expectedOutput: {
      type: String,
      required: true,
      trim: true,
    },

    // false = visible to candidate
    // true = hidden from candidate
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true,
  }
);

// ============================================
// QUESTION SCHEMA
// ============================================

const questionSchema = new mongoose.Schema(
  {
    // ========================================
    // QUESTION TYPE
    // ========================================

    questionType: {
      type: String,
      enum: ["mcq", "output", "coding"],
      default: "mcq",
      required: true,
    },

    // ========================================
    // DOMAIN
    // ========================================

    domain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
    },

    // ========================================
    // QUESTION
    // ========================================

    questionText: {
      type: String,
      required: true,
      trim: true,
    },

    // ========================================
    // MCQ / OUTPUT OPTIONS
    // ========================================

    optionA: {
      type: String,
      default: null,
    },

    optionB: {
      type: String,
      default: null,
    },

    optionC: {
      type: String,
      default: null,
    },

    optionD: {
      type: String,
      default: null,
    },

    // ========================================
    // CORRECT OPTION
    // Only for MCQ / Output
    // ========================================

    correctOption: {
      type: String,
      enum: ["A", "B", "C", "D", null],
      default: null,
    },

    // ========================================
    // CODING QUESTION LANGUAGE
    //
    // Examples:
    // javascript
    // typescript
    // python
    // java
    // cpp
    // c
    // sql
    // bash
    // ========================================

    language: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    // ========================================
    // STARTER CODE
    // Used only for coding questions
    // ========================================

    starterCode: {
      type: String,
      default: "",
    },

    // ========================================
    // TEST CASES
    //
    // Coding questions:
    // EXACTLY 5
    // 3 visible
    // 2 hidden
    // ========================================

    testCases: {
      type: [testCaseSchema],
      default: [],
    },

    // ========================================
    // MARKS
    // ========================================

    marks: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Question", questionSchema);