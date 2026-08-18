const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Optional because authentication is OTP-based
    password: {
      type: String,
      select: false,
    },

    // Becomes true after successful OTP verification
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Becomes true after accepting Terms & Conditions
    isTermsAccepted: {
      type: Boolean,
      default: false,
    },

    termsAcceptedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);