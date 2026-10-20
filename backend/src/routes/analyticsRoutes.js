const express = require('express');
const {
  getExamAnalytics,
  getStudentProgress,
  getCenterDashboard,
} = require('../services/analyticsService');
const { success } = require('../utils/apiResponse');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { tenant } = require('../middleware/tenant');

const router = express.Router();
router.use(protect, tenant);

router.get('/exam/:examId', authorize('centeradmin', 'teacher'), async (req, res, next) => {
  try {
    const data = await getExamAnalytics(req.params.examId, req.centerId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
});

router.get('/student/progress', authorize('student'), async (req, res, next) => {
  try {
    const data = await getStudentProgress(req.user._id, req.centerId);
    return success(res, { progress: data });
  } catch (err) {
    next(err);
  }
});

router.get('/center/dashboard', authorize('centeradmin'), async (req, res, next) => {
  try {
    const data = await getCenterDashboard(req.centerId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
