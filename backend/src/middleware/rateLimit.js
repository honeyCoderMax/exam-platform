const rateLimit = require('express-rate-limit');
const { rateLimit: rlConfig } = require('../config/env');

const globalLimiter = rateLimit({
  windowMs: rlConfig.windowMs,
  max: rlConfig.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' },
});

const attemptLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many requests' },
});

module.exports = { globalLimiter, authLimiter, attemptLimiter };
