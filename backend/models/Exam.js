const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    // ============================================
    // CANDIDATE
    // ============================================

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ============================================
    // DOMAIN
    // ============================================

    domain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
    },

    // ============================================
    // SELECTED QUESTIONS
    //
    // These are the exact questions assigned
    // to this particular exam attempt.
    // ============================================

    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],

    // ============================================
    // EXAM TIMING
    // ============================================

    startTime: {
      type: Date,
    },

    endTime: {
      type: Date,
    },

    // ============================================
    // EXAM STATUS
    // ============================================

    status: {
      type: String,
      enum: [
        "not_started",
        "in_progress",
        "completed",
      ],
      default: "not_started",
    },

    // ============================================
    // SCORE
    // ============================================

    score: {
      type: Number,
      default: 0,
    },

    totalMarks: {
      type: Number,
      default: 0,
    },

    // ============================================
    // AUTO SUBMITTED
    //
    // True when an admin force-completed this exam
    // (candidate never returned to close it out) or
    // when it was auto-closed after expiry.
    // ============================================

    autoSubmitted: {
      type: Boolean,
      default: false,
    },

    // Candidate recording is stored on the server and is available to admins
    // only after the attempt is completed.
    recording: {
      path: String,
      mimeType: String,
      size: Number,
      originalName: String,
      uploadedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Exam", examSchema);