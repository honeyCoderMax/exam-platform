const express = require('express');
const Plan = require('../models/Plan');
const { success } = require('../utils/apiResponse');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });
    return success(res, { plans });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
