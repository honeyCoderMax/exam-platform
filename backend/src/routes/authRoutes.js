const express = require('express');
const { body } = require('express-validator');
const {
  registerCenter,
  login,
  refresh,
  logout,
  me,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post(
  '/register-center',
  authLimiter,
  [
    body('centerName').trim().notEmpty().withMessage('Center name required'),
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validate,
  registerCenter
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  login
);

router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, me);

module.exports = router;
