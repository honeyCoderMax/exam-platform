const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const required = [
  "MYSQL_HOST",
  "MYSQL_USER",
  "MYSQL_DATABASE",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];
required.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing required env variable: ${key}`);
    process.exit(1);
  }
});

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  apiUrl: process.env.API_URL || "http://localhost:5000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  mysql: {
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  cookie: {
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || "Exam Platform <noreply@examplatform.com>",
  },
  upload: {
    path: process.env.UPLOAD_PATH || "uploads",
    maxFileSize: process.env.MAX_FILE_SIZE || "5mb",
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  superAdmin: {
    email: process.env.SUPERADMIN_EMAIL || "superadmin@examplatform.com",
    password: process.env.SUPERADMIN_PASSWORD || "SuperAdmin@123",
  },
};
