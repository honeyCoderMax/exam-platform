const { forbidden } = require('../utils/apiResponse');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return forbidden(res, 'Not authenticated');
    }
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Role ${req.user.role} is not allowed to access this resource`);
    }
    next();
  };
};

module.exports = { authorize };
