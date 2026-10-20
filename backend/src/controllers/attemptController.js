const Attempt = require("../models/Attempt");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const Result = require("../models/Result");
const { gradeAttempt, calculateRanks } = require("../services/gradingService");
const {
  success,
  created,
  badRequest,
  notFound,
  forbidden,
} = require("../utils/apiResponse");
const { shuffleArray, getRemainingSeconds } = require("../utils/helpers");
const { AppError } = require("../middleware/error");

/**
 * Start an attempt – server sets endsAt, shuffles questions
 */
const startAttempt = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const studentId = req.user._id;
    const centerId = req.centerId;

    const exam = await Exam.findOne({ _id: examId, centerId });
    if (!exam) return notFound(res, "Exam not found");
    if (!exam.isPublished) return forbidden(res, "Exam is not published");

    const now = new Date();
    if (now < new Date(exam.schedule.startAt)) {
      return badRequest(res, "Exam has not started yet");
    }
    if (now > new Date(exam.schedule.endAt)) {
      return badRequest(res, "Exam window has closed");
    }

    // Check existing completed attempts against maxAttempts
    const completedCount = await Attempt.countDocuments({
      examId,
      studentId,
      status: { $in: ["submitted", "auto_submitted", "terminated"] },
    });
    if (completedCount >= (exam.settings.maxAttempts || 1)) {
      return badRequest(res, "Maximum attempts reached");
    }

    // Resume if in_progress exists
    let attempt = await Attempt.findOne({
      examId,
      studentId,
      status: "in_progress",
    });
    if (attempt) {
      const remaining = getRemainingSeconds(attempt.endsAt);
      if (remaining <= 0) {
        attempt.status = "auto_submitted";
        attempt.submittedAt = new Date();
        await attempt.save();
        await gradeAttempt(attempt._id);
        await calculateRanks(examId);
        return badRequest(
          res,
          "Previous attempt time expired and was auto-submitted",
        );
      }
      return success(
        res,
        {
          attemptId: attempt._id,
          endsAt: attempt.endsAt,
          timeRemainingSeconds: remaining,
          questionOrder: attempt.questionOrder,
          answers: attempt.answers,
          currentQuestionIndex: attempt.currentQuestionIndex,
          resumed: true,
        },
        "Attempt resumed",
      );
    }

    // Build question order
    let questionIds = exam.questions.map((q) => q.questionId);
    if (exam.settings.shuffleQuestions) {
      questionIds = shuffleArray(questionIds);
    }

    const durationMs = (exam.settings.durationMinutes || 60) * 60 * 1000;
    const endsAt = new Date(
      Math.min(
        now.getTime() + durationMs,
        new Date(exam.schedule.endAt).getTime(),
      ),
    );

    attempt = await Attempt.create({
      centerId,
      examId,
      studentId,
      questionOrder: questionIds,
      endsAt,
      timeRemainingSeconds: Math.floor((endsAt - now) / 1000),
      answers: [],
      status: "in_progress",
    });

    // Increment usage count on questions
    await Question.updateMany(
      { _id: { $in: questionIds } },
      { $inc: { usageCount: 1 } },
    );

    return created(
      res,
      {
        attemptId: attempt._id,
        endsAt: attempt.endsAt,
        timeRemainingSeconds: attempt.timeRemainingSeconds,
        questionOrder: attempt.questionOrder,
        answers: [],
        currentQuestionIndex: 0,
        resumed: false,
      },
      "Attempt started",
    );
  } catch (err) {
    if (
      err.code === 11000 ||
      err.code === "ER_DUP_ENTRY" ||
      err.errno === 1062 ||
      err.original?.errno === 1062 ||
      err.parent?.errno === 1062
    ) {
      return badRequest(res, "An active attempt already exists");
    }
    next(err);
  }
};

/**
 * Get attempt for resume (with questions WITHOUT correct answers)
 */
const getAttempt = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.attemptId);
    if (!attempt) return notFound(res, "Attempt not found");
    if (attempt.studentId.toString() !== req.user._id.toString()) {
      return forbidden(res, "Not your attempt");
    }

    const remaining = getRemainingSeconds(attempt.endsAt);
    if (attempt.status === "in_progress" && remaining <= 0) {
      attempt.status = "auto_submitted";
      attempt.submittedAt = new Date();
      await attempt.save();
      await gradeAttempt(attempt._id);
      await calculateRanks(attempt.examId);
      return badRequest(res, "Time expired – attempt auto-submitted");
    }

    // Load questions without correct answers
    const questions = await Question.find({
      _id: { $in: attempt.questionOrder },
    }).select("-correctAnswer -explanation");

    // Strip isCorrect from options
    const safeQuestions = questions.map((q) => {
      const obj = q.toObject();
      if (obj.options) {
        obj.options = obj.options.map((o) => ({
          _id: o._id,
          text: o.text,
        }));
      }
      return obj;
    });

    // Preserve order
    const ordered = attempt.questionOrder
      .map((id) =>
        safeQuestions.find((q) => q._id.toString() === id.toString()),
      )
      .filter(Boolean);

    return success(res, {
      attempt: {
        id: attempt._id,
        status: attempt.status,
        endsAt: attempt.endsAt,
        timeRemainingSeconds: remaining,
        currentQuestionIndex: attempt.currentQuestionIndex,
        answers: attempt.answers,
        violationCount: attempt.violationCount,
      },
      questions: ordered,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Auto-save a single answer
 */
const saveAnswer = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const {
      questionId,
      selectedOptions,
      numericAnswer,
      textAnswer,
      isMarkedForReview,
      timeSpentSeconds,
      currentQuestionIndex,
    } = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return notFound(res, "Attempt not found");
    if (attempt.studentId.toString() !== req.user._id.toString()) {
      return forbidden(res, "Not your attempt");
    }
    if (attempt.status !== "in_progress") {
      return badRequest(res, "Attempt is not in progress");
    }

    const remaining = getRemainingSeconds(attempt.endsAt);
    if (remaining <= 0) {
      attempt.status = "auto_submitted";
      attempt.submittedAt = new Date();
      await attempt.save();
      await gradeAttempt(attempt._id);
      return badRequest(res, "Time expired");
    }

    const idx = attempt.answers.findIndex(
      (a) => a.questionId.toString() === questionId.toString(),
    );
    const answerData = {
      questionId,
      selectedOptions: selectedOptions || [],
      numericAnswer: numericAnswer || "",
      textAnswer: textAnswer || "",
      isMarkedForReview: !!isMarkedForReview,
      timeSpentSeconds: timeSpentSeconds || 0,
    };

    if (idx >= 0) {
      attempt.answers[idx] = answerData;
    } else {
      attempt.answers.push(answerData);
    }

    if (typeof currentQuestionIndex === "number") {
      attempt.currentQuestionIndex = currentQuestionIndex;
    }
    attempt.timeRemainingSeconds = remaining;
    await attempt.save();

    return success(
      res,
      { saved: true, timeRemainingSeconds: remaining },
      "Answer saved",
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Submit attempt
 */
const submitAttempt = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.attemptId);
    if (!attempt) return notFound(res, "Attempt not found");
    if (attempt.studentId.toString() !== req.user._id.toString()) {
      return forbidden(res, "Not your attempt");
    }
    if (attempt.status !== "in_progress") {
      return badRequest(res, "Attempt already submitted");
    }

    attempt.status = "submitted";
    attempt.submittedAt = new Date();
    attempt.timeRemainingSeconds = getRemainingSeconds(attempt.endsAt);
    await attempt.save();

    const result = await gradeAttempt(attempt._id);
    await calculateRanks(attempt.examId);

    return success(
      res,
      {
        resultId: result._id,
        score: result.score,
        percentage: result.percentage,
      },
      "Submitted successfully",
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Log a violation (tab switch, etc.)
 */
const logViolation = async (req, res, next) => {
  try {
    const { type, details } = req.body;
    const attempt = await Attempt.findById(req.params.attemptId);
    if (!attempt) return notFound(res, "Attempt not found");
    if (attempt.studentId.toString() !== req.user._id.toString()) {
      return forbidden(res, "Not your attempt");
    }
    if (attempt.status !== "in_progress") {
      return badRequest(res, "Attempt not active");
    }

    attempt.violations.push({ type: type || "other", details: details || "" });
    attempt.violationCount = (attempt.violationCount || 0) + 1;

    // Auto-terminate after 5 violations
    const MAX_VIOLATIONS = 5;
    if (attempt.violationCount >= MAX_VIOLATIONS) {
      attempt.status = "terminated";
      attempt.submittedAt = new Date();
      await attempt.save();
      await gradeAttempt(attempt._id);
      return success(
        res,
        { terminated: true, violationCount: attempt.violationCount },
        "Attempt terminated due to violations",
      );
    }

    await attempt.save();
    return success(
      res,
      { violationCount: attempt.violationCount },
      "Violation logged",
    );
  } catch (err) {
    next(err);
  }
};

const myAttempts = async (req, res, next) => {
  try {
    const attempts = await Attempt.find({
      studentId: req.user._id,
      centerId: req.centerId,
    })
      .populate("examId", "title schedule settings")
      .sort({ createdAt: -1 })
      .limit(50);
    return success(res, { attempts });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startAttempt,
  getAttempt,
  saveAnswer,
  submitAttempt,
  logViolation,
  myAttempts,
};
