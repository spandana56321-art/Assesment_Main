const jwt = require("jsonwebtoken");
const { Resend } = require("resend");

const User = require("../models/User");
const Otp = require("../models/Otp");

// ====================================
// Resend Client
// ====================================

const resend = new Resend(process.env.RESEND_API_KEY);

// ====================================
// Generate Random 6-Digit OTP
// ====================================

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ====================================
// Generate JWT
// ====================================

const signToken = (userId) =>
  jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );

// ====================================
// Send OTP Email (via Resend)
// ====================================

const sendOtpEmail = async (email, otpCode) => {
  await resend.emails.send({
    from: "SkillBridge Assessments <onboarding@resend.dev>", // replace with your verified domain sender if you have one
    to: email,
    subject: "Your SkillBridge Assessment OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        
        <h2>SkillBridge Assessments</h2>

        <p>Hello,</p>

        <p>
          Your verification code for the SkillBridge Assessment is:
        </p>

        <h1 style="letter-spacing: 6px;">
          ${otpCode}
        </h1>

        <p>
          This OTP is valid for 5 minutes.
        </p>

        <p>
          Please do not share this OTP with anyone.
        </p>

        <p>
          If you did not request this OTP, you can safely ignore this email.
        </p>

      </div>
    `,
  });
};



const register = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // -------------------------------
    // Validate input
    // -------------------------------

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email and phone are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();

    // -------------------------------
    // Find existing user
    // -------------------------------

    let user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { phone: normalizedPhone },
      ],
    });

    // -------------------------------
    // Create user if not exists
    // -------------------------------

    if (!user) {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
      });
    } else {
      // Update details if user already exists
      user.name = name.trim();
      user.email = normalizedEmail;
      user.phone = normalizedPhone;

      await user.save();
    }

    // -------------------------------
    // Generate random OTP
    // -------------------------------

    const otpCode = generateOtp();

    // -------------------------------
    // OTP expiry
    // -------------------------------

    const expiresAt = new Date(
      Date.now() +
        (Number(process.env.OTP_EXPIRES_MINUTES) || 5) *
          60 *
          1000
    );

    // -------------------------------
    // Remove previous unused OTPs
    // -------------------------------

    await Otp.deleteMany({
      user: user._id,
      isUsed: false,
    });

    // -------------------------------
    // Save new OTP
    // -------------------------------

    await Otp.create({
      user: user._id,
      otpCode,
      expiresAt,
    });

    // -------------------------------
    // Send OTP through Resend
    // -------------------------------

    await sendOtpEmail(
      normalizedEmail,
      otpCode
    );

    console.log(
      `OTP sent to ${normalizedEmail}`
    );

    // -------------------------------
    // Response
    // IMPORTANT:
    // Do NOT send OTP to frontend
    // -------------------------------

    return res.status(201).json({
      success: true,
      message: "OTP sent successfully",
      userId: user._id,
    });

  } catch (err) {
    console.error(
      "Register / Send OTP Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ====================================
// Verify OTP
// ====================================

const verifyOtp = async (req, res) => {
  try {
    const { userId, otpCode } = req.body;

    // -------------------------------
    // Validate input
    // -------------------------------

    if (!userId || !otpCode) {
      return res.status(400).json({
        success: false,
        message: "userId and otpCode are required",
      });
    }

    // -------------------------------
    // Validate OTP format
    // -------------------------------

    if (!/^\d{6}$/.test(otpCode.toString())) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a valid 6-digit number",
      });
    }

    // -------------------------------
    // Find latest unused OTP
    // -------------------------------

    const otpDoc = await Otp.findOne({
      user: userId,
      otpCode: otpCode.toString(),
      isUsed: false,
    }).sort({
      createdAt: -1,
    });

    // -------------------------------
    // OTP not found
    // -------------------------------

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // -------------------------------
    // Check expiry
    // -------------------------------

    if (otpDoc.expiresAt < new Date()) {
      await Otp.deleteOne({
        _id: otpDoc._id,
      });

      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    // -------------------------------
    // Mark OTP as used
    // -------------------------------

    otpDoc.isUsed = true;

    await otpDoc.save();

    // -------------------------------
    // Verify user
    // -------------------------------

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isVerified: true,
      },
      {
        new: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // -------------------------------
    // Generate JWT
    // -------------------------------

    const token = signToken(user._id);

    // -------------------------------
    // Response
    // -------------------------------

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        isTermsAccepted: user.isTermsAccepted,
      },
    });

  } catch (err) {
    console.error(
      "Verify OTP Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ====================================
// Resend OTP
// ====================================

const resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;

    // -------------------------------
    // Find user
    // -------------------------------

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // -------------------------------
    // Generate new OTP
    // -------------------------------

    const otpCode = generateOtp();

    // -------------------------------
    // Expiry
    // -------------------------------

    const expiresAt = new Date(
      Date.now() +
        (Number(process.env.OTP_EXPIRES_MINUTES) || 5) *
          60 *
          1000
    );

    // -------------------------------
    // Remove old OTPs
    // -------------------------------

    await Otp.deleteMany({
      user: user._id,
      isUsed: false,
    });

    // -------------------------------
    // Save new OTP
    // -------------------------------

    await Otp.create({
      user: user._id,
      otpCode,
      expiresAt,
    });

    // -------------------------------
    // Send new OTP email
    // -------------------------------

    await sendOtpEmail(
      user.email,
      otpCode
    );

    console.log(
      `OTP resent to ${user.email}`
    );

    // -------------------------------
    // Response
    // -------------------------------

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
    });

  } catch (err) {
    console.error(
      "Resend OTP Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ====================================
// Accept Terms
// ====================================

const acceptTerms = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        isTermsAccepted: true,
        termsAcceptedAt: new Date(),
      },
      {
        new: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Terms accepted",
      isTermsAccepted: user.isTermsAccepted,
    });

  } catch (err) {
    console.error(
      "Accept Terms Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ====================================
// Get Logged-in User
// ====================================

const getMe = async (req, res) => {
  const user = req.user.toObject ? req.user.toObject() : { ...req.user };
  delete user.identityVerification;
  return res.status(200).json({
    success: true,
    user,
  });
};

// ====================================
// Exports
// ====================================

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  acceptTerms,
  getMe,
};