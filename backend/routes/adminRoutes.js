const express = require("express");
const router = express.Router();

const {
  loginAdmin,
  getDashboardStats,

  createDomain,
  getAllDomains,
  getDomainById,
  updateDomain,
  deleteDomain,

  getAllQuestions,
  getQuestionById,
  getQuestionsByDomainAdmin,
  updateQuestion,
  deleteQuestion,
  getExamById,
  getAllExams,
  forceFinishExam,
} = require("../controllers/admincontroller");

const {
  protectAdmin,
} = require("../middleware/adminAuth");
const { createQuestion } = require("../controllers/QuestionController");

/* =========================================
   AUTH
========================================= */

router.post(
  "/login",
  loginAdmin
);

/* =========================================
   DASHBOARD
========================================= */

router.get(
  "/stats",
  protectAdmin,
  getDashboardStats
);

/* =========================================
   DOMAIN CRUD
========================================= */

router.post(
  "/domains",
  protectAdmin,
  createDomain
);

router.get(
  "/domains",
  protectAdmin,
  getAllDomains
);

router.get(
  "/domains/:id",
  protectAdmin,
  getDomainById
);

router.put(
  "/domains/:id",
  protectAdmin,
  updateDomain
);

router.delete(
  "/domains/:id",
  protectAdmin,
  deleteDomain
);

/* =========================================
   QUESTION CRUD
========================================= */

// Get all questions
router.get(
  "/questions",
  protectAdmin,
  getAllQuestions
);

// Get questions by domain
router.get(
  "/questions/domain/:domainId",
  protectAdmin,
  getQuestionsByDomainAdmin
);

// Get single question
router.get(
  "/questions/:id",
  protectAdmin,
  getQuestionById
);

// Update question
router.put(
  "/questions/:id",
  protectAdmin,
  updateQuestion
);

// Delete question
router.delete(
  "/questions/:id",
  protectAdmin,
  deleteQuestion
);


router.get(
  "/exams/:id",
  protectAdmin,
  getExamById
);

router.get(
  "/exams",
  protectAdmin,
  getAllExams
);

router.post(
  "/exams/:id/force-finish",
  protectAdmin,
  forceFinishExam
);


router.post(
  "/questions",
  protectAdmin,
  createQuestion
);
module.exports = router;