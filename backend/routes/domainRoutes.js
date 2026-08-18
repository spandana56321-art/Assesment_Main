const express = require("express");
const router = express.Router();
const { getDomains, getDomainById, createDomain } = require("../controllers/domainController");
const { protect, requireTermsAccepted } = require("../middleware/auth");

// Screen 3: Domain list (only visible after T&C accepted)
router.get("/", protect, requireTermsAccepted, getDomains);

// Screen 4: Domain detail
router.get("/:id", protect, requireTermsAccepted, getDomainById);

// admin/seed use
router.post("/", protect, createDomain);

module.exports = router;
