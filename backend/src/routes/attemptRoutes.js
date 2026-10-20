const express = require('express');
const {
  startAttempt,
  getAttempt,
  saveAnswer,
  submitAttempt,
  logViolation,
  myAttempts,
} = require('../controllers/attemptController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { tenant } = require('../middleware/tenant');
const { attemptLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use(protect, tenant, authorize('student'));

router.get('/my-attempts', myAttempts);
router.post('/start/:examId', startAttempt);
router.get('/:attemptId', getAttempt);
router.patch('/:attemptId/answer', attemptLimiter, saveAnswer);
router.post('/:attemptId/submit', submitAttempt);
router.post('/:attemptId/violation', logViolation);

module.exports = router;
