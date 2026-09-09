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
const multer = require("multer");
const { uploadRecording } = require("../controllers/mediaController");

const recordingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Start exam
router.post("/start", protect, requireTermsAccepted, startExam);

// Get currently active exam
router.get("/active", protect, requireTermsAccepted, getActiveExam);

// Submit answer
router.post("/answer", protect, requireTermsAccepted, submitAnswer);

// Finish exam
router.post("/:examId/finish", protect, requireTermsAccepted, finishExam);

// Save final candidate recording. Candidate can upload only their own completed exam.
router.post(
  "/:examId/recording",
  protect,
  recordingUpload.single("recording"),
  uploadRecording
);

// Get result
router.get("/:examId/result", protect, getExamResult);

module.exports = router;
