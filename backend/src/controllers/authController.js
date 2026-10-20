const User = require('../models/User');
const Center = require('../models/Center');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/generateTokens');
const { generateCode, slugify } = require('../utils/helpers');
const { success, created, badRequest, unauthorized, conflict } = require('../utils/apiResponse');
const { AppError } = require('../middleware/error');
const { sendWelcomeEmail } = require('../services/emailService');
const { cookie } = require('../config/env');

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

/**
 * Register a new coaching center + first centeradmin
 */
const registerCenter = async (req, res, next) => {
  try {
    const { centerName, name, email, password, phone, referralCode } = req.body;

    if (!centerName || !name || !email || !password) {
      return badRequest(res, 'centerName, name, email and password are required');
    }

    const existing = await User.findOne({ email: email.toLowerCase(), centerId: null });
    // Also check if email already used as centeradmin somewhere
    const emailTaken = await User.findOne({ email: email.toLowerCase() });
    if (emailTaken) return conflict(res, 'Email already registered');

    let baseSlug = slugify(centerName);
    let slug = baseSlug;
    let i = 1;
    while (await Center.findOne({ slug })) {
      slug = `${baseSlug}-${i++}`;
    }

    const center = await Center.create({
      name: centerName,
      slug,
      email: email.toLowerCase(),
      phone: phone || '',
      referralCode: generateCode(8),
      referredBy: referralCode || null,
      status: 'trial',
    });

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      role: 'centeradmin',
      centerId: center._id,
      isEmailVerified: true,
    });

    center.owner = admin._id;
    await center.save();

    // Attach free trial subscription
    const trialPlan = await Plan.findOne({ slug: 'free-trial' });
    if (trialPlan) {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + (trialPlan.trialDays || 14));
      await Subscription.create({
        centerId: center._id,
        planId: trialPlan._id,
        status: 'trial',
        startDate: now,
        endDate: end,
        trialEndsAt: end,
      });
    }

    const payload = { id: admin._id, role: admin.role, centerId: center._id };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    admin.refreshToken = refreshToken;
    await admin.save({ validateBeforeSave: false });

    setRefreshCookie(res, refreshToken);

    // Fire and forget welcome email
    sendWelcomeEmail(admin, center.name).catch(() => {});

    return created(res, {
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        centerId: center._id,
      },
      center: {
        id: center._id,
        name: center.name,
        slug: center.slug,
      },
      accessToken,
    }, 'Center registered successfully');
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, centerSlug } = req.body;
    if (!email || !password) return badRequest(res, 'Email and password required');

    let user;
    if (centerSlug) {
      const center = await Center.findOne({ slug: centerSlug });
      if (!center) return unauthorized(res, 'Invalid center');
      user = await User.findOne({ email: email.toLowerCase(), centerId: center._id }).select(
        '+password +refreshToken'
      );
    } else {
      // Try superadmin first, then any user with that email (prefer centeradmin)
      user = await User.findOne({ email: email.toLowerCase(), role: 'superadmin' }).select(
        '+password +refreshToken'
      );
      if (!user) {
        user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
      }
    }

    if (!user || !(await user.comparePassword(password))) {
      return unauthorized(res, 'Invalid credentials');
    }
    if (!user.isActive) return unauthorized(res, 'Account is deactivated');

    const payload = {
      id: user._id,
      role: user.role,
      centerId: user.centerId || null,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    setRefreshCookie(res, refreshToken);

    return success(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        centerId: user.centerId,
      },
      accessToken,
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (!token) return unauthorized(res, 'No refresh token');

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return unauthorized(res, 'Invalid refresh token');
    }

    const payload = {
      id: user._id,
      role: user.role,
      centerId: user.centerId || null,
    };
    const accessToken = generateAccessToken(payload);
    const newRefresh = generateRefreshToken(payload);

    user.refreshToken = newRefresh;
    await user.save({ validateBeforeSave: false });
    setRefreshCookie(res, newRefresh);

    return success(res, { accessToken }, 'Token refreshed');
  } catch (err) {
    return unauthorized(res, 'Invalid or expired refresh token');
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    }
    res.clearCookie('refreshToken');
    return success(res, null, 'Logged out');
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('centerId', 'name slug logo primaryColor secondaryColor status')
      .populate('batches', 'name');
    return success(res, { user }, 'Profile fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerCenter,
  login,
  refresh,
  logout,
  me,
};
