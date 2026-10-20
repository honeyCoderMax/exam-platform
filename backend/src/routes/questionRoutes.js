const express = require('express');
const multer = require('multer');
const {
  listQuestions,
  createQuestion,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUpload,
  getSubjects,
} = require('../controllers/questionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { tenant } = require('../middleware/tenant');
const { checkPlanLimit } = require('../middleware/planLimit');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();

router.use(protect, tenant, authorize('centeradmin', 'teacher'));

router.get('/', listQuestions);
router.get('/subjects', getSubjects);
router.get('/:id', getQuestion);
router.post('/', checkPlanLimit('question'), createQuestion);
router.post('/bulk', checkPlanLimit('question'), upload.single('file'), bulkUpload);
router.patch('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);

module.exports = router;
