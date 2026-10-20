const express = require('express');
const Result = require('../models/Result');
const { gradeAttempt, regradeExam, calculateRanks } = require('../services/gradingService');
const { success, notFound, forbidden, badRequest } = require('../utils/apiResponse');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { tenant } = require('../middleware/tenant');

const router = express.Router();
router.use(protect, tenant);

router.get('/exam/:examId', async (req, res, next) => {
  try {
    const filter = { examId: req.params.examId, centerId: req.centerId };
    if (req.user.role === 'student') filter.studentId = req.user._id;

    const results = await Result.find(filter)
      .populate('studentId', 'name email')
      .populate('examId', 'title')
      .sort({ rank: 1 });
    return success(res, { results });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await Result.findOne({ _id: req.params.id, centerId: req.centerId })
      .populate('studentId', 'name email')
      .populate('examId', 'title settings');
    if (!result) return notFound(res, 'Result not found');
    if (req.user.role === 'student' && result.studentId._id.toString() !== req.user._id.toString()) {
      return forbidden(res, 'Not your result');
    }
    return success(res, { result });
  } catch (err) {
    next(err);
  }
});

router.post('/exam/:examId/regrade', authorize('centeradmin', 'teacher'), async (req, res, next) => {
  try {
    const results = await regradeExam(req.params.examId);
    return success(res, { count: results.length }, 'Re-graded successfully');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/manual-grade', authorize('centeradmin', 'teacher'), async (req, res, next) => {
  try {
    const { questionId, marksObtained } = req.body;
    const result = await Result.findOne({ _id: req.params.id, centerId: req.centerId });
    if (!result) return notFound(res, 'Result not found');

    const qw = result.questionWise.find((q) => q.questionId.toString() === questionId);
    if (!qw) return badRequest(res, 'Question not found in result');

    const diff = Number(marksObtained) - qw.marksObtained;
    qw.marksObtained = Number(marksObtained);
    qw.isCorrect = Number(marksObtained) > 0;
    qw.needsManualReview = false;

    result.score = Math.max(0, result.score + diff);
    result.percentage = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 10000) / 100 : 0;
    result.isManuallyGraded = true;
    result.gradedBy = req.user._id;
    result.gradedAt = new Date();
    await result.save();

    await calculateRanks(result.examId);
    return success(res, { result }, 'Manual grade applied');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
