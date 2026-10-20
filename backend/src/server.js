const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { port, nodeEnv } = require('./config/env');
const { initSockets } = require('./sockets');
const { startExamReminderJob } = require('./jobs/examReminderJob');
const { startSubscriptionJob } = require('./jobs/subscriptionJob');

const start = async () => {
  await connectDB();

  const server = http.createServer(app);
  initSockets(server);

  // Cron jobs
  startExamReminderJob();
  startSubscriptionJob();

  server.listen(port, () => {
    console.log(`Server running in ${nodeEnv} mode on port ${port}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
