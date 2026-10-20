const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const { razorpay: razorpayConfig } = require('../config/env');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const { AppError } = require('../middleware/error');

const createOrder = async ({ centerId, planId, amount, currency = 'INR' }) => {
  if (!razorpay) throw new AppError('Payment gateway not configured', 503);

  const plan = await Plan.findById(planId);
  if (!plan) throw new AppError('Plan not found', 404);

  const options = {
    amount: Math.round(amount * 100), // paise
    currency,
    receipt: `rcpt_${centerId}_${Date.now()}`,
    notes: { centerId: centerId.toString(), planId: planId.toString() },
  };

  const order = await razorpay.orders.create(options);

  const payment = await Payment.create({
    centerId,
    amount,
    currency,
    razorpayOrderId: order.id,
    status: 'created',
    metadata: { planId },
  });

  return { order, payment };
};

const verifyPayment = async ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  centerId,
}) => {
  if (!razorpayConfig.keySecret) throw new AppError('Payment gateway not configured', 503);

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', razorpayConfig.keySecret)
    .update(body)
    .digest('hex');

  if (expected !== razorpaySignature) {
    throw new AppError('Invalid payment signature', 400);
  }

  const payment = await Payment.findOne({ razorpayOrderId, centerId });
  if (!payment) throw new AppError('Payment record not found', 404);
  if (payment.status === 'paid') return { payment, alreadyProcessed: true };

  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.status = 'paid';
  payment.paidAt = new Date();
  await payment.save();

  // Activate / extend subscription
  const planId = payment.metadata?.planId;
  if (planId) {
    const plan = await Plan.findById(planId);
    if (plan) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      let sub = await Subscription.findOne({ centerId, status: { $in: ['trial', 'active', 'past_due'] } });
      if (sub) {
        sub.planId = plan._id;
        sub.status = 'active';
        sub.startDate = now;
        sub.endDate = endDate;
        sub.autoRenew = true;
        await sub.save();
      } else {
        sub = await Subscription.create({
          centerId,
          planId: plan._id,
          status: 'active',
          startDate: now,
          endDate,
          autoRenew: true,
        });
      }
      payment.subscriptionId = sub._id;
      await payment.save();
    }
  }

  return { payment, alreadyProcessed: false };
};

module.exports = { createOrder, verifyPayment };
