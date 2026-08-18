const mongoose = require("mongoose");

const domainSchema = new mongoose.Schema(
  {
    // ============================================
    // DOMAIN BASIC INFO
    // ============================================

    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // ============================================
    // EXAM DURATION
    // ============================================

    durationMinutes: {
      type: Number,
      required: true,
      default: 30,
      min: 1,
    },

    // ============================================
    // QUESTION POOL COUNT
    //
    // Total number of questions available
    // in MongoDB for this domain.
    //
    // Example:
    // React has 20 questions in the bank.
    // totalQuestions = 20
    //
    // This is NOT the number shown in one exam.
    // ============================================

    totalQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ============================================
    // QUESTIONS PER EXAM
    //
    // Example:
    // 4 MCQ + 2 Coding = 6 questions
    // ============================================

    questionsPerExam: {
      type: Number,
      default: 6,
      min: 1,
    },

    // ============================================
    // MCQ QUESTIONS PER EXAM
    // ============================================

    mcqQuestionsPerExam: {
      type: Number,
      default: 4,
      min: 0,
    },

    // ============================================
    // CODING QUESTIONS PER EXAM
    // ============================================

    codingQuestionsPerExam: {
      type: Number,
      default: 2,
      min: 0,
    },

    // ============================================
    // DOMAIN STATUS
    // ============================================

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Domain", domainSchema);