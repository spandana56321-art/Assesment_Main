const express = require("express");
const router = express.Router();

const {
  startExam,
  getActiveExam,
  submitAnswer,
  finishExam,
  getExamResult,
} = require("../controllers/examController");

const {
  protect,
  requireTermsAccepted,
} = require("../middleware/auth");

// Start exam
router.post("/start", protect, requireTermsAccepted, startExam);

// Get currently active exam
router.get("/active", protect, requireTermsAccepted, getActiveExam);

// Submit answer
router.post("/answer", protect, requireTermsAccepted, submitAnswer);

// Finish exam
router.post("/:examId/finish", protect, requireTermsAccepted, finishExam);

// Get result
router.get("/:examId/result", protect, getExamResult);

module.exports = router;
