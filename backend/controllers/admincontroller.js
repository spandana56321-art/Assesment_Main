const Admin = require("../models/admin");
const Domain = require("../models/Domain");
const User = require("../models/User");
const Question = require("../models/Question");
const Exam = require("../models/Exam");
const Answer = require("../models/Answer");

const {
  calculateExamScore,
  isExamExpired,
} = require("./examController");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* =========================================
   ADMIN LOGIN
========================================= */

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      admin.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        role: "admin",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   DASHBOARD STATS
========================================= */

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

/* =========================================
   CREATE DOMAIN
========================================= */

const createDomain = async (req, res) => {
  try {
    const {
      name,
      description,
      durationMinutes,
      questionsPerExam,
      mcqQuestionsPerExam,
      codingQuestionsPerExam,
    } = req.body;

    const existingDomain =
      await Domain.findOne({ name });

    if (existingDomain) {
      return res.status(400).json({
        success: false,
        message: "Domain already exists",
      });
    }

    const domain = await Domain.create({
      name,
      description,
      durationMinutes,
      questionsPerExam,
      mcqQuestionsPerExam,
      codingQuestionsPerExam,
    });

    return res.status(201).json({
      success: true,
      message: "Domain created successfully",
      domain,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   GET ALL DOMAINS
========================================= */

const getAllDomains = async (req, res) => {
  try {
    const domains = await Domain.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: domains.length,
      domains,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   GET DOMAIN BY ID
========================================= */

const getDomainById = async (req, res) => {
  try {
    const domain = await Domain.findById(
      req.params.id
    );

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "Domain not found",
      });
    }

    return res.status(200).json({
      success: true,
      domain,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   UPDATE DOMAIN
========================================= */

const updateDomain = async (req, res) => {
  try {
    const domain =
      await Domain.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
        }
      );

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "Domain not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Domain updated successfully",
      domain,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   DELETE DOMAIN
========================================= */

const deleteDomain = async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "Domain not found",
      });
    }

    domain.isActive = false;
    await domain.save();

    return res.status(200).json({
      success: true,
      message: "Domain deactivated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find()
      .populate("domain", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(
      req.params.id
    ).populate("domain", "name");

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    return res.status(200).json({
      success: true,
      question,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getQuestionsByDomainAdmin = async (
  req,
  res
) => {
  try {
    const questions = await Question.find({
      domain: req.params.domainId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(
      req.params.id
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    await Question.findByIdAndDelete(
      req.params.id
    );

    await Domain.findByIdAndUpdate(
      question.domain,
      {
        $inc: { totalQuestions: -1 },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};





const updateQuestion = async (req, res) => {
  try {
    const question =
      await Question.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Question updated successfully",
      question,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================================
   GET ALL EXAMS
========================================= */

const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate("user", "name email")
      .populate("domain", "name durationMinutes")
      .sort({ createdAt: -1 });

    // ========================================
    // FLAG ABANDONED EXAMS
    //
    // The candidate-side expiry check only runs
    // lazily, when the candidate hits the API
    // again (submit answer / resume exam). If they
    // close the tab and never come back, the exam
    // just sits at status "in_progress" forever.
    // Flag those here so the dashboard can surface
    // them and let an admin force-complete them.
    // ========================================

    const examsWithStuckFlag = exams.map((exam) => {
      const isStuck =
        exam.status === "in_progress" &&
        isExamExpired(exam, exam.domain);

      return {
        ...exam.toObject(),
        isStuck,
      };
    });

    return res.status(200).json({
      success: true,
      count: exams.length,
      exams: examsWithStuckFlag,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================
   FORCE-FINISH AN ABANDONED EXAM
   ========================================= */
//
// POST /admin/exams/:id/force-finish
//
// For exams stuck at "in_progress" because the
// candidate never returned to trigger the normal
// expiry check. Scores whatever was answered so
// far and closes the exam out, same as the
// candidate-side auto-submit path.
//

const forceFinishExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    if (exam.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "This exam is already completed.",
      });
    }

    const score = await calculateExamScore(exam._id);

    exam.status = "completed";
    exam.autoSubmitted = true;
    exam.endTime = new Date();
    exam.score = score;

    await exam.save();

    return res.status(200).json({
      success: true,
      message: "Exam force-completed.",
      exam,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================================
   GET EXAM BY ID
========================================= */

const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(
      req.params.id
    )
      .populate("user", "name email")
      .populate("domain", "name")
      .populate("questions");

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // ========================================
    // FETCH ANSWERS FOR THIS EXAM
    //
    // Answers live in a separate collection,
    // keyed by (exam, question). Merge them
    // onto each question so the admin dashboard
    // can show what the candidate submitted.
    // ========================================

    const answers = await Answer.find({
      exam: exam._id,
    });

    const answersByQuestion = {};
    answers.forEach((a) => {
      answersByQuestion[a.question.toString()] = a;
    });

    const questionsWithAnswers = exam.questions.map(
      (q) => {
        const answer = answersByQuestion[q._id.toString()];

        return {
          ...q.toObject(),
          answer: answer
            ? {
                answerType: answer.answerType,
                selectedOption: answer.selectedOption,
                code: answer.code,
                isCorrect: answer.isCorrect,
                testCaseResults: answer.testCaseResults,
                passedTestCases: answer.passedTestCases,
                totalTestCases: answer.totalTestCases,
              }
            : null,
        };
      }
    );

    return res.status(200).json({
      success: true,
      exam: {
        ...exam.toObject(),
        questions: questionsWithAnswers,
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
};