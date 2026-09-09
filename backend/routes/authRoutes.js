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
const multer = require("multer");
const { uploadVerification } = require("../controllers/mediaController");

const verificationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

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
// Identity verification upload
// ====================================

router.post(
  "/verification",
  protect,
  verificationUpload.single("idDocument"),
  uploadVerification
);

// ====================================
// Get Logged-in User
// ====================================

router.get("/me", protect, getMe);

module.exports = router;