const Razorpay = require('razorpay');
const { razorpay } = require('./env');

let instance = null;
if (razorpay.keyId && razorpay.keySecret) {
  instance = new Razorpay({
    key_id: razorpay.keyId,
    key_secret: razorpay.keySecret,
  });
} else {
  console.warn('Razorpay keys not configured – payment features disabled');
}

module.exports = instance;
