const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const User = require('../models/User');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const { forbidden, badRequest } = require('../utils/apiResponse');

/**
 * Check plan limits before creating resources
 * type: 'student' | 'question' | 'exam'
 */
const checkPlanLimit = (type) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'superadmin') return next();

      const centerId = req.centerId;
      if (!centerId) return badRequest(res, 'Center required');

      const sub = await Subscription.findOne({ centerId, status: { $in: ['trial', 'active'] } })
        .populate('planId')
        .sort({ createdAt: -1 });

      if (!sub || !sub.planId) {
        return forbidden(res, 'No active subscription. Please subscribe to a plan.');
      }

      const plan = sub.planId;
      const limits = plan.limits || {};

      if (type === 'student') {
        const count = await User.countDocuments({ centerId, role: 'student', isActive: true });
        if (limits.maxStudents && count >= limits.maxStudents) {
          return forbidden(res, `Student limit reached (${limits.maxStudents}). Upgrade your plan.`);
        }
      }

      if (type === 'question') {
        const count = await Question.countDocuments({ centerId, isActive: true });
        if (limits.maxQuestions && count >= limits.maxQuestions) {
          return forbidden(res, `Question bank limit reached (${limits.maxQuestions}). Upgrade your plan.`);
        }
      }

      if (type === 'exam') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const count = await Exam.countDocuments({
          centerId,
          createdAt: { $gte: startOfMonth },
        });
        if (limits.maxExamsPerMonth && count >= limits.maxExamsPerMonth) {
          return forbidden(res, `Monthly exam limit reached (${limits.maxExamsPerMonth}). Upgrade your plan.`);
        }
      }

      req.subscription = sub;
      req.plan = plan;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { checkPlanLimit };
