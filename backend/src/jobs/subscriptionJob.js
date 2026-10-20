const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const Center = require('../models/Center');
const User = require('../models/User');
const { sendSubscriptionExpiring } = require('../services/emailService');

const startSubscriptionJob = () => {
  // Daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      const now = new Date();
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Expire subscriptions
      await Subscription.updateMany(
        { status: { $in: ['trial', 'active'] }, endDate: { $lt: now } },
        { status: 'expired' }
      );

      // Reminders for expiring soon
      const expiring = await Subscription.find({
        status: { $in: ['trial', 'active'] },
        endDate: { $gte: now, $lte: in3Days },
      }).populate('centerId');

      for (const sub of expiring) {
        const center = sub.centerId;
        if (!center) continue;
        const admin = await User.findOne({ centerId: center._id, role: 'centeradmin', isActive: true });
        if (admin) {
          const daysLeft = Math.ceil((new Date(sub.endDate) - now) / (24 * 60 * 60 * 1000));
          sendSubscriptionExpiring(admin, center, daysLeft).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[SubscriptionJob]', err.message);
    }
  });
  console.log('Subscription cron started');
};

module.exports = { startSubscriptionJob };
