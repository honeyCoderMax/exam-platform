const express = require('express');
const {
  listExams,
  createExam,
  addQuestions,
  updateExam,
  getExam,
  publishExam,
  deleteExam,
} = require('../controllers/examController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { tenant } = require('../middleware/tenant');
const { checkPlanLimit } = require('../middleware/planLimit');

const router = express.Router();

router.use(protect, tenant);

router.get('/', listExams);
router.get('/:id', getExam);

router.post('/', authorize('centeradmin', 'teacher'), checkPlanLimit('exam'), createExam);
router.post('/:id/questions', authorize('centeradmin', 'teacher'), addQuestions);
router.patch('/:id', authorize('centeradmin', 'teacher'), updateExam);
router.post('/:id/publish', authorize('centeradmin', 'teacher'), publishExam);
router.delete('/:id', authorize('centeradmin', 'teacher'), deleteExam);

module.exports = router;
