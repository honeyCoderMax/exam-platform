const Exam = require("../models/Exam");
const Question = require("../models/Question");
const {
  success,
  created,
  badRequest,
  notFound,
  forbidden,
} = require("../utils/apiResponse");

const listExams = async (req, res, next) => {
  try {
    const filter = { centerId: req.centerId };
    if (req.query.status) filter.status = req.query.status;

    // Students only see published exams assigned to their batches
    if (req.user.role === "student") {
      filter.isPublished = true;
      filter.assignedBatches = { $in: req.user.batches || [] };
      filter.status = { $in: ["scheduled", "live", "completed"] };
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [exams, total] = await Promise.all([
      Exam.find(filter)
        .populate("createdBy", "name")
        .populate("assignedBatches", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Exam.countDocuments(filter),
    ]);

    return success(res, {
      exams,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const createExam = async (req, res, next) => {
  try {
    const {
      title,
      description,
      durationMinutes,
      passingMarks,
      negativeMarking,
      shuffleQuestions,
      shuffleOptions,
      maxAttempts,
      startAt,
      endAt,
      assignedBatches,
    } = req.body;

    if (!title || !durationMinutes || !startAt || !endAt) {
      return badRequest(
        res,
        "title, durationMinutes, startAt, endAt are required",
      );
    }

    const exam = await Exam.create({
      centerId: req.centerId,
      createdBy: req.user._id,
      title,
      description: description || "",
      settings: {
        durationMinutes,
        totalMarks: 0,
        passingMarks: passingMarks || 0,
        negativeMarking: negativeMarking !== false,
        shuffleQuestions: shuffleQuestions !== false,
        shuffleOptions: shuffleOptions !== false,
        maxAttempts: maxAttempts || 1,
      },
      schedule: { startAt: new Date(startAt), endAt: new Date(endAt) },
      assignedBatches: assignedBatches || [],
      status: "draft",
      isPublished: false,
      questions: [],
    });

    return created(res, { exam }, "Exam created");
  } catch (err) {
    next(err);
  }
};

/**
 * Add questions manually or auto-generate by rules
 * body: { questionIds: [] } OR { auto: { subject, easy: 10, medium: 10, hard: 5 } }
 */
const addQuestions = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      centerId: req.centerId,
    });
    if (!exam) return notFound(res, "Exam not found");
    if (exam.status === "completed")
      return badRequest(res, "Cannot modify completed exam");

    let toAdd = [];

    if (req.body.questionIds && Array.isArray(req.body.questionIds)) {
      const qs = await Question.find({
        _id: { $in: req.body.questionIds },
        centerId: req.centerId,
        isActive: true,
      });
      toAdd = qs.map((q) => ({ questionId: q._id, marksOverride: null }));
    } else if (req.body.auto) {
      const { subject, easy = 0, medium = 0, hard = 0 } = req.body.auto;
      const fetchByDiff = async (diff, count) => {
        if (count <= 0) return [];
        const filter = {
          centerId: req.centerId,
          isActive: true,
          difficulty: diff,
        };
        if (subject) filter.subject = subject;
        const qs = await Question.sample(filter, count);
        return qs.map((q) => ({ questionId: q._id, marksOverride: null }));
      };
      toAdd = [
        ...(await fetchByDiff("easy", easy)),
        ...(await fetchByDiff("medium", medium)),
        ...(await fetchByDiff("hard", hard)),
      ];
    } else {
      return badRequest(res, "Provide questionIds or auto rules");
    }

    // Avoid duplicates
    const existing = new Set(
      exam.questions.map((q) => q.questionId.toString()),
    );
    const unique = toAdd.filter((q) => !existing.has(q.questionId.toString()));
    exam.questions.push(...unique);

    // Recalculate total marks
    const allQs = await Question.find({
      _id: { $in: exam.questions.map((q) => q.questionId) },
    });
    const qMap = new Map(allQs.map((q) => [q._id.toString(), q]));
    exam.settings.totalMarks = exam.questions.reduce((sum, eq) => {
      const q = qMap.get(eq.questionId.toString());
      return (
        sum + (eq.marksOverride != null ? eq.marksOverride : q?.marks || 0)
      );
    }, 0);

    await exam.save();
    return success(res, { exam, added: unique.length }, "Questions added");
  } catch (err) {
    next(err);
  }
};

const updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      centerId: req.centerId,
    });
    if (!exam) return notFound(res, "Exam not found");

    const allowed = ["title", "description", "assignedBatches", "isPublished"];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) exam[k] = req.body[k];
    });

    if (req.body.settings) {
      Object.assign(exam.settings, req.body.settings);
    }
    if (req.body.schedule) {
      if (req.body.schedule.startAt)
        exam.schedule.startAt = new Date(req.body.schedule.startAt);
      if (req.body.schedule.endAt)
        exam.schedule.endAt = new Date(req.body.schedule.endAt);
    }
    if (req.body.status) exam.status = req.body.status;

    await exam.save();
    return success(res, { exam }, "Exam updated");
  } catch (err) {
    next(err);
  }
};

const getExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      centerId: req.centerId,
    })
      .populate("createdBy", "name")
      .populate("assignedBatches", "name")
      .populate({
        path: "questions.questionId",
        select:
          req.user.role === "student"
            ? "-correctAnswer -explanation -options.isCorrect"
            : "",
      });

    if (!exam) return notFound(res, "Exam not found");

    // Students must not see correct answers before exam ends
    if (req.user.role === "student") {
      const now = new Date();
      if (now < new Date(exam.schedule.endAt) && exam.status !== "completed") {
        // already stripped via select
      }
    }

    return success(res, { exam });
  } catch (err) {
    next(err);
  }
};

const publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      centerId: req.centerId,
    });
    if (!exam) return notFound(res, "Exam not found");
    if (!exam.questions.length)
      return badRequest(res, "Add questions before publishing");

    exam.isPublished = true;
    exam.status = "scheduled";
    await exam.save();
    return success(res, { exam }, "Exam published");
  } catch (err) {
    next(err);
  }
};

const deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndDelete({
      _id: req.params.id,
      centerId: req.centerId,
    });
    if (!exam) return notFound(res, "Exam not found");
    return success(res, null, "Exam deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listExams,
  createExam,
  addQuestions,
  updateExam,
  getExam,
  publishExam,
  deleteExam,
};
