const { forbidden, badRequest } = require('../utils/apiResponse');

/**
 * Inject and enforce centerId for multi-tenancy.
 * Superadmin can optionally pass centerId in query/body for cross-tenant actions.
 */
const tenant = (req, res, next) => {
  if (req.user.role === 'superadmin') {
    // Superadmin may operate without a center or on a specific center
    req.centerId = req.query.centerId || req.body.centerId || null;
    return next();
  }

  if (!req.user.centerId) {
    return forbidden(res, 'No center associated with this account');
  }

  req.centerId = req.user.centerId.toString();
  next();
};

/**
 * Ensure a document belongs to the current tenant
 */
const ensureTenantDoc = (doc) => {
  if (!doc) return false;
  if (!doc.centerId) return true; // platform-level docs
  return doc.centerId.toString() === req.centerId?.toString?.() || false;
};

module.exports = { tenant };
