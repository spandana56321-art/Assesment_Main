const express = require("express");

const router = express.Router();

const {
  register,
  verifyOtp,
  resendOtp,
  acceptTerms,
  getMe,
} = require("../controllers/authController");

const { protect } = require("../middleware/auth");

// ====================================
// Screen 1: Register
// Name + Email + Phone -> Send OTP
// ====================================

router.post("/register", register);

// ====================================
// Screen 1: Verify OTP
// OTP -> JWT Login
// ====================================

router.post("/verify-otp", verifyOtp);

// ====================================
// Resend OTP
// ====================================

router.post("/resend-otp", resendOtp);

// ====================================
// Screen 2: Accept Terms
// ====================================

router.post("/accept-terms", protect, acceptTerms);

// ====================================
// Get Logged-in User
// ====================================

router.get("/me", protect, getMe);

module.exports = router;