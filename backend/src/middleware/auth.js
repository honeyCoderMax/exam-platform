const { verifyAccessToken } = require('../utils/generateTokens');
const { unauthorized } = require('../utils/apiResponse');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return unauthorized(res, 'Not authorized, no token');
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user || !user.isActive) {
      return unauthorized(res, 'User not found or inactive');
    }

    req.user = user;
    next();
  } catch (err) {
    return unauthorized(res, 'Not authorized, token failed');
  }
};

module.exports = { protect };
