const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

const { clientUrl, nodeEnv } = require('./config/env');
const { globalLimiter } = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/error');

const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const attemptRoutes = require('./routes/attemptRoutes');
const questionRoutes = require('./routes/questionRoutes');

// Additional route stubs (can be expanded)
const resultRoutes = require('./routes/resultRoutes');
const batchRoutes = require('./routes/batchRoutes');
const planRoutes = require('./routes/planRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);
app.use(morgan(nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(globalLimiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/attempts', attemptRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/results', resultRoutes);
app.use('/api/v1/batches', batchRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
