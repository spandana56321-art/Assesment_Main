const User = require("../models/User");
const Domain = require("../models/Domain");
const Question = require("../models/Question");
const Exam = require("../models/Exam");

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalDomains,
      totalQuestions,
      totalExams,
    ] = await Promise.all([
      User.countDocuments(),
      Domain.countDocuments(),
      Question.countDocuments(),
      Exam.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalDomains,
        totalQuestions,
        totalExams,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
};