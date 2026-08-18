const Domain = require("../models/Domain");
const Question = require("../models/Question");
const Exam = require("../models/Exam");
const Answer = require("../models/Answer");

/* =========================================
   HELPERS
========================================= */

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Strip anything the candidate shouldn't see (correct answers, hidden test case outputs)
const prepareCandidateQuestion = (question) => {
  const q = question.toObject ? question.toObject() : question;

  const safeTestCases =
    q.questionType === "coding"
      ? (q.testCases || [])
          .filter((tc) => !tc.isHidden)
          .map((tc) => ({
            _id: tc._id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
          }))
      : undefined;

  const isChoiceQuestion =
    q.questionType === "mcq" || q.questionType === "output";

  return {
    _id: q._id,
    domain: q.domain,
    questionType: q.questionType,
    questionText: q.questionText,
    optionA: isChoiceQuestion ? q.optionA : undefined,
    optionB: isChoiceQuestion ? q.optionB : undefined,
    optionC: isChoiceQuestion ? q.optionC : undefined,
    optionD: isChoiceQuestion ? q.optionD : undefined,
    language: q.questionType === "coding" ? q.language : undefined,
    starterCode: q.questionType === "coding" ? q.starterCode : undefined,
    marks: q.marks,
    testCases: safeTestCases,
  };
};

const isExamExpired = (exam, domain) => {
  if (!exam || !domain) return false;
  const durationMs = Number(domain.durationMinutes || 0) * 60 * 1000;
  const deadline = new Date(exam.startTime).getTime() + durationMs;
  return Date.now() > deadline;
};

const calculateExamScore = async (examId) => {
  const answers = await Answer.find({ exam: examId }).populate("question");

  let score = 0;

  answers.forEach((answer) => {
    if (!answer.question) return;

    const marks = Number(answer.question.marks || 1);

    if (answer.answerType === "mcq" || answer.answerType === "output") {
      if (answer.isCorrect) {
        score += marks;
      }
    } else if (answer.answerType === "coding") {
      if (answer.totalTestCases > 0) {
        score += (answer.passedTestCases / answer.totalTestCases) * marks;
      }
    }
  });

  return Math.round(score * 100) / 100;
};

/* =========================================
   START EXAM
========================================= */

const startExam = async (req, res) => {
  try {
    const { domainId } = req.body;

    if (!domainId) {
      return res.status(400).json({
        success: false,
        message: "domainId is required",
      });
    }

    const domain = await Domain.findOne({ _id: domainId, isActive: true });

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "Domain not found or inactive",
      });
    }

    const mcqRequired = Number(domain.mcqQuestionsPerExam ?? 4);
    const codingRequired = Number(domain.codingQuestionsPerExam ?? 2);
    const questionsRequired = Number(
      domain.questionsPerExam ?? mcqRequired + codingRequired
    );

    if (mcqRequired < 0 || codingRequired < 0 || questionsRequired <= 0) {
      return res.status(500).json({
        success: false,
        message: "Invalid exam configuration for this domain",
      });
    }

    if (mcqRequired + codingRequired !== questionsRequired) {
      return res.status(500).json({
        success: false,
        message:
          "Exam configuration is invalid. MCQ and coding question counts must equal questionsPerExam.",
      });
    }

    const activeExam = await Exam.findOne({
      user: req.user._id,
      status: "in_progress",
    }).sort({ createdAt: -1 });

    if (activeExam) {
      const activeDomain = await Domain.findById(activeExam.domain);

      if (activeDomain && !isExamExpired(activeExam, activeDomain)) {
        return res.status(400).json({
          success: false,
          message:
            "You already have an active exam. Please finish the current exam before starting another one.",
          examId: activeExam._id,
        });
      }

      const expiredScore = await calculateExamScore(activeExam._id);
      activeExam.status = "completed";
      activeExam.endTime = new Date();
      activeExam.score = expiredScore;
      await activeExam.save();
    }

    const mcqQuestions = await Question.find({
      domain: domainId,
      questionType: "mcq",
    });

    const codingQuestions = await Question.find({
      domain: domainId,
      questionType: "coding",
    });

    if (mcqQuestions.length < mcqRequired) {
      return res.status(400).json({
        success: false,
        message: `Not enough MCQ questions available for this assessment. Required: ${mcqRequired}, Available: ${mcqQuestions.length}`,
      });
    }

    if (codingQuestions.length < codingRequired) {
      return res.status(400).json({
        success: false,
        message: `Not enough coding questions available for this assessment. Required: ${codingRequired}, Available: ${codingQuestions.length}`,
      });
    }

    const selectedMcq = shuffleArray(mcqQuestions).slice(0, mcqRequired);
    const selectedCoding = shuffleArray(codingQuestions).slice(
      0,
      codingRequired
    );
    const selectedQuestions = shuffleArray([
      ...selectedMcq,
      ...selectedCoding,
    ]);

    if (selectedQuestions.length !== questionsRequired) {
      return res.status(500).json({
        success: false,
        message: "Unable to create the required exam question set.",
      });
    }

    const totalMarks = selectedQuestions.reduce(
      (sum, question) => sum + Number(question.marks || 1),
      0
    );

    const startTime = new Date();

    const exam = await Exam.create({
      user: req.user._id,
      domain: domainId,
      questions: selectedQuestions.map((question) => question._id),
      startTime,
      status: "in_progress",
      totalMarks,
    });

    const candidateQuestions = selectedQuestions.map(prepareCandidateQuestion);

    return res.status(201).json({
      success: true,
      examId: exam._id,
      durationMinutes: domain.durationMinutes,
      startTime: exam.startTime,
      totalMarks,
      questions: candidateQuestions,
    });
  } catch (err) {
    console.error("Start Exam Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================
   SUBMIT ANSWER
========================================= */

const submitAnswer = async (req, res) => {
  try {
    const { examId, questionId, selectedOption, code } = req.body;

    if (!examId || !questionId) {
      return res.status(400).json({
        success: false,
        message: "examId and questionId are required",
      });
    }

    const exam = await Exam.findOne({ _id: examId, user: req.user._id });

    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }

    if (exam.status === "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Exam already submitted" });
    }

    const isAssignedQuestion = (exam.questions || []).some(
      (assignedQuestionId) =>
        assignedQuestionId.toString() === questionId.toString()
    );

    if (!isAssignedQuestion) {
      return res.status(400).json({
        success: false,
        message: "Question is not assigned to this exam",
      });
    }

    const domain = await Domain.findById(exam.domain);

    if (!domain) {
      return res
        .status(404)
        .json({ success: false, message: "Exam domain not found" });
    }

    if (isExamExpired(exam, domain)) {
      const expiredScore = await calculateExamScore(exam._id);
      exam.status = "completed";
      exam.endTime = new Date();
      exam.score = expiredScore;
      await exam.save();

      return res.status(400).json({
        success: false,
        message:
          "Exam time has expired. Your exam has been submitted automatically.",
        examId: exam._id,
      });
    }

    const question = await Question.findById(questionId);

    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    if (question.questionType === "mcq" || question.questionType === "output") {
      if (!selectedOption) {
        return res.status(400).json({
          success: false,
          message: "selectedOption is required",
        });
      }

      if (!["A", "B", "C", "D"].includes(selectedOption)) {
        return res.status(400).json({
          success: false,
          message: "selectedOption must be A, B, C or D",
        });
      }

      const isCorrect = question.correctOption === selectedOption;

      const answer = await Answer.findOneAndUpdate(
        { exam: examId, question: questionId },
        {
          exam: examId,
          question: questionId,
          answerType: question.questionType,
          selectedOption,
          code: null,
          isCorrect,
          testCaseResults: [],
          passedTestCases: 0,
          totalTestCases: 0,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({
        success: true,
        message: "Answer saved",
        answer: {
          id: answer._id,
          examId: answer.exam,
          questionId: answer.question,
          answerType: answer.answerType,
          selectedOption: answer.selectedOption,
          isCorrect: answer.isCorrect,
        },
      });
    }

    if (question.questionType === "coding") {
      if (typeof code !== "string" || code.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "code is required for coding questions",
        });
      }

      const testCases = question.testCases || [];

      const testCaseResults = testCases.map((testCase) => ({
        testCaseId: testCase._id,
        passed: false,
        actualOutput: "",
        expectedOutput: testCase.isHidden ? "" : testCase.expectedOutput,
        error: "",
      }));

      const answer = await Answer.findOneAndUpdate(
        { exam: examId, question: questionId },
        {
          exam: examId,
          question: questionId,
          answerType: "coding",
          selectedOption: null,
          code,
          isCorrect: false,
          testCaseResults,
          passedTestCases: 0,
          totalTestCases: testCases.length,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({
        success: true,
        message: "Code submitted successfully",
        evaluationPending: true,
        answer: {
          id: answer._id,
          examId: answer.exam,
          questionId: answer.question,
          answerType: answer.answerType,
          passedTestCases: answer.passedTestCases,
          totalTestCases: answer.totalTestCases,
          isCorrect: answer.isCorrect,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: `Unsupported question type: ${question.questionType}`,
    });
  } catch (err) {
    console.error("Submit Answer Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================
   FINISH EXAM
========================================= */

const finishExam = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findOne({ _id: examId, user: req.user._id });

    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }

    if (exam.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Exam already submitted",
        examId: exam._id,
        score: exam.score,
        totalMarks: exam.totalMarks,
      });
    }

    const domain = await Domain.findById(exam.domain);

    if (!domain) {
      return res
        .status(404)
        .json({ success: false, message: "Exam domain not found" });
    }

    const score = await calculateExamScore(exam._id);

    exam.status = "completed";
    exam.endTime = new Date();
    exam.score = score;
    await exam.save();

    return res.status(200).json({
      success: true,
      message: "Exam submitted",
      examId: exam._id,
      score,
      totalMarks: exam.totalMarks,
    });
  } catch (err) {
    console.error("Finish Exam Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================
   GET ACTIVE EXAM (resume)
========================================= */

const getActiveExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      user: req.user._id,
      status: "in_progress",
    })
      .sort({ createdAt: -1 })
      .populate("domain");

    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "No active exam found" });
    }

    if (!exam.domain) {
      return res
        .status(404)
        .json({ success: false, message: "Exam domain not found" });
    }

    if (isExamExpired(exam, exam.domain)) {
      const expiredScore = await calculateExamScore(exam._id);
      exam.status = "completed";
      exam.endTime = new Date();
      exam.score = expiredScore;
      await exam.save();

      return res.status(400).json({
        success: false,
        message: "Your active exam has expired and was submitted automatically.",
        examId: exam._id,
      });
    }

    const questions = await Question.find({
      _id: { $in: exam.questions || [] },
    });

    if (questions.length !== (exam.questions || []).length) {
      return res.status(400).json({
        success: false,
        message: "Some questions assigned to this exam are no longer available.",
      });
    }

    const questionMap = new Map(
      questions.map((question) => [question._id.toString(), question])
    );

    const orderedQuestions = (exam.questions || [])
      .map((questionId) => questionMap.get(questionId.toString()))
      .filter(Boolean);

    const candidateQuestions = orderedQuestions.map(prepareCandidateQuestion);

    const answers = await Answer.find({ exam: exam._id });

    const savedAnswers = answers.map((answer) => ({
      questionId: answer.question,
      answerType: answer.answerType,
      selectedOption: answer.selectedOption,
      code: answer.answerType === "coding" ? answer.code : null,
    }));

    return res.status(200).json({
      success: true,
      examId: exam._id,
      durationMinutes: exam.domain.durationMinutes,
      startTime: exam.startTime,
      status: exam.status,
      totalMarks: exam.totalMarks,
      domain: {
        _id: exam.domain._id,
        name: exam.domain.name,
        description: exam.domain.description,
      },
      questions: candidateQuestions,
      answers: savedAnswers,
    });
  } catch (err) {
    console.error("Get Active Exam Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================
   GET EXAM RESULT
========================================= */

const getExamResult = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.examId,
      user: req.user._id,
    }).populate("domain");

    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }

    const answers = await Answer.find({ exam: exam._id }).populate("question");

    return res.status(200).json({
      success: true,
      exam,
      answers: answers.map((answer) => ({
        questionId: answer.question?._id,
        questionType: answer.question?.questionType,
        answerType: answer.answerType,
        selectedOption: answer.selectedOption,
        isCorrect: answer.isCorrect,
        passedTestCases: answer.passedTestCases,
        totalTestCases: answer.totalTestCases,
        testCaseResults: answer.testCaseResults.map((result) => ({
          testCaseId: result.testCaseId,
          passed: result.passed,
          actualOutput: result.actualOutput,
          expectedOutput: result.expectedOutput,
          error: result.error,
        })),
      })),
    });
  } catch (err) {
    console.error("Get Exam Result Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  calculateExamScore,
  isExamExpired,
  startExam,
  submitAnswer,
  finishExam,
  getActiveExam,
  getExamResult,
};
