const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized, token invalid" });
  }
};

// Blocks access to Domain/Exam routes until the user has accepted T&C on the Auction screen
const requireTermsAccepted = (req, res, next) => {
  if (!req.user.isTermsAccepted) {
    return res.status(403).json({
      success: false,
      message: "Please accept the Terms & Conditions on the Auction screen first",
    });
  }
  next();
};

module.exports = { protect, requireTermsAccepted };
