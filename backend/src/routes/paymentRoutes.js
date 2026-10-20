const express = require('express');
const { createOrder, verifyPayment } = require('../services/paymentService');
const { success, badRequest } = require('../utils/apiResponse');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { tenant } = require('../middleware/tenant');
const Plan = require('../models/Plan');

const router = express.Router();

router.post('/create-order', protect, tenant, authorize('centeradmin'), async (req, res, next) => {
  try {
    const { planId, currency = 'INR' } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan) return badRequest(res, 'Plan not found');

    const amount = currency === 'USD' ? plan.priceMonthlyUSD : plan.priceMonthlyINR;
    const { order, payment } = await createOrder({
      centerId: req.centerId,
      planId,
      amount,
      currency,
    });

    return success(res, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/verify', protect, tenant, authorize('centeradmin'), async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const result = await verifyPayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      centerId: req.centerId,
    });
    return success(res, result, 'Payment verified and subscription activated');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
