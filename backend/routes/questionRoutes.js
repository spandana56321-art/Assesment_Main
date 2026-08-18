  const express = require("express");

  const router = express.Router();

  const {
    createQuestion,
    getQuestionsByDomain,
  } = require("../controllers/QuestionController");

  const {
    protect,
  } = require("../middleware/auth");

  // ============================================
  // CREATE QUESTION
  // ============================================

  router.post(
    "/",
    protect,
    createQuestion
  );

  // ============================================
  // GET QUESTIONS FOR CANDIDATE
  // ============================================

  router.get(
    "/:domainId",
    protect,
    getQuestionsByDomain
  );

  module.exports = router;