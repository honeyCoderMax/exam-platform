const nodemailer = require('nodemailer');
const { email: emailConfig, frontendUrl } = require('../config/env');

let transporter = null;

if (emailConfig.host && emailConfig.user && emailConfig.pass) {
  transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.port === 465,
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass,
    },
  });
} else {
  console.warn('Email credentials not configured – emails will be logged only');
}

const sendEmail = async ({ to, subject, html, text }) => {
  const mailOptions = {
    from: emailConfig.from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  };

  if (!transporter) {
    console.log('[Email Mock]', { to, subject });
    return { messageId: 'mock' };
  }

  return transporter.sendMail(mailOptions);
};

const sendWelcomeEmail = async (user, centerName) => {
  return sendEmail({
    to: user.email,
    subject: `Welcome to ${centerName} – Exam Platform`,
    html: `
      <h2>Welcome, ${user.name}!</h2>
      <p>Your account has been created on <strong>${centerName}</strong>.</p>
      <p>Role: <strong>${user.role}</strong></p>
      <p><a href="${frontendUrl}/login">Login here</a></p>
    `,
  });
};

const sendExamReminder = async (user, exam) => {
  return sendEmail({
    to: user.email,
    subject: `Reminder: ${exam.title} starts soon`,
    html: `
      <h2>Exam Reminder</h2>
      <p>Hi ${user.name},</p>
      <p>Your exam <strong>${exam.title}</strong> starts at ${new Date(exam.schedule.startAt).toLocaleString()}.</p>
      <p>Duration: ${exam.settings.durationMinutes} minutes</p>
      <p><a href="${frontendUrl}/student/exams/${exam._id}">Go to exam</a></p>
    `,
  });
};

const sendResultPublished = async (user, exam, result) => {
  return sendEmail({
    to: user.email,
    subject: `Result published: ${exam.title}`,
    html: `
      <h2>Result Available</h2>
      <p>Hi ${user.name},</p>
      <p>Your result for <strong>${exam.title}</strong> is ready.</p>
      <p>Score: <strong>${result.score} / ${result.maxScore}</strong> (${result.percentage}%)</p>
      <p><a href="${frontendUrl}/student/results/${result._id}">View detailed report</a></p>
    `,
  });
};

const sendSubscriptionExpiring = async (centerAdmin, center, daysLeft) => {
  return sendEmail({
    to: centerAdmin.email,
    subject: `Subscription expiring in ${daysLeft} days – ${center.name}`,
    html: `
      <h2>Subscription Expiring Soon</h2>
      <p>Hi ${centerAdmin.name},</p>
      <p>Your subscription for <strong>${center.name}</strong> expires in ${daysLeft} day(s).</p>
      <p><a href="${frontendUrl}/admin/subscription">Renew now</a></p>
    `,
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendExamReminder,
  sendResultPublished,
  sendSubscriptionExpiring,
};
