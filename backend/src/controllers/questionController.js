const Question = require('../models/Question');
const XLSX = require('xlsx');
const { success, created, badRequest, notFound } = require('../utils/apiResponse');

const listQuestions = async (req, res, next) => {
  try {
    const filter = { centerId: req.centerId, isActive: true };
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.topic) filter.topic = req.query.topic;
    if (req.query.q) {
      filter.$or = [
        { questionText: { $regex: req.query.q, $options: 'i' } },
        { tags: { $regex: req.query.q, $options: 'i' } },
      ];
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [questions, total] = await Promise.all([
      Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Question.countDocuments(filter),
    ]);

    return success(res, {
      questions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const createQuestion = async (req, res, next) => {
  try {
    const data = { ...req.body, centerId: req.centerId, createdBy: req.user._id };
    const question = await Question.create(data);
    return created(res, { question }, 'Question created');
  } catch (err) {
    next(err);
  }
};

const getQuestion = async (req, res, next) => {
  try {
    const question = await Question.findOne({ _id: req.params.id, centerId: req.centerId });
    if (!question) return notFound(res, 'Question not found');
    return success(res, { question });
  } catch (err) {
    next(err);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findOneAndUpdate(
      { _id: req.params.id, centerId: req.centerId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!question) return notFound(res, 'Question not found');
    return success(res, { question }, 'Question updated');
  } catch (err) {
    next(err);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findOneAndUpdate(
      { _id: req.params.id, centerId: req.centerId },
      { isActive: false },
      { new: true }
    );
    if (!question) return notFound(res, 'Question not found');
    return success(res, null, 'Question deleted');
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk upload from CSV/Excel
 * Expected columns: type, subject, chapter, topic, difficulty, questionText, option1, option2, option3, option4, correctOptions (1-based comma), marks, negativeMarks, explanation, tags, correctAnswer
 */
const bulkUpload = async (req, res, next) => {
  try {
    if (!req.file) return badRequest(res, 'File required');

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const errors = [];
    const toInsert = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;
      try {
        if (!row.type || !row.subject || !row.questionText || !row.marks) {
          errors.push({ row: rowNum, message: 'Missing required fields (type, subject, questionText, marks)' });
          return;
        }

        const options = [];
        for (let i = 1; i <= 6; i++) {
          const key = `option${i}`;
          if (row[key]) {
            options.push({ text: String(row[key]), isCorrect: false });
          }
        }

        if (['mcq_single', 'mcq_multiple', 'true_false'].includes(row.type) && options.length === 0) {
          errors.push({ row: rowNum, message: 'Options required for MCQ/TF' });
          return;
        }

        // Mark correct options (1-based indexes, comma separated)
        if (row.correctOptions && options.length) {
          const corrects = String(row.correctOptions).split(',').map((s) => parseInt(s.trim(), 10) - 1);
          corrects.forEach((ci) => {
            if (options[ci]) options[ci].isCorrect = true;
          });
        }

        toInsert.push({
          centerId: req.centerId,
          createdBy: req.user._id,
          type: row.type,
          subject: String(row.subject).trim(),
          chapter: row.chapter ? String(row.chapter).trim() : '',
          topic: row.topic ? String(row.topic).trim() : '',
          difficulty: row.difficulty || 'medium',
          questionText: String(row.questionText),
          options,
          correctAnswer: row.correctAnswer ? String(row.correctAnswer) : '',
          marks: Number(row.marks),
          negativeMarks: Number(row.negativeMarks) || 0,
          explanation: row.explanation ? String(row.explanation) : '',
          tags: row.tags ? String(row.tags).split(',').map((t) => t.trim()).filter(Boolean) : [],
        });
      } catch (e) {
        errors.push({ row: rowNum, message: e.message });
      }
    });

    let inserted = 0;
    if (toInsert.length) {
      const result = await Question.insertMany(toInsert, { ordered: false });
      inserted = result.length;
    }

    return success(res, {
      inserted,
      failed: errors.length,
      errors,
    }, `Bulk upload completed: ${inserted} inserted, ${errors.length} failed`);
  } catch (err) {
    next(err);
  }
};

const getSubjects = async (req, res, next) => {
  try {
    const subjects = await Question.distinct('subject', { centerId: req.centerId, isActive: true });
    return success(res, { subjects });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listQuestions,
  createQuestion,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUpload,
  getSubjects,
};
