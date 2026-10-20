const cron = require('node-cron');
const Exam = require('../models/Exam');
const User = require('../models/User');
const Batch = require('../models/Batch');
const { sendExamReminder } = require('../services/emailService');

const startExamReminderJob = () => {
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

      const exams = await Exam.find({
        isPublished: true,
        status: { $in: ['scheduled', 'live'] },
        'schedule.startAt': { $gte: now, $lte: inOneHour },
      }).populate('assignedBatches');

      for (const exam of exams) {
        const studentIds = new Set();
        for (const batch of exam.assignedBatches || []) {
          const b = await Batch.findById(batch._id || batch).select('students');
          (b?.students || []).forEach((id) => studentIds.add(id.toString()));
        }
        const students = await User.find({
          _id: { $in: [...studentIds] },
          role: 'student',
          isActive: true,
        });
        for (const student of students) {
          sendExamReminder(student, exam).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[ExamReminderJob]', err.message);
    }
  });
  console.log('Exam reminder cron started');
};

module.exports = { startExamReminderJob };
