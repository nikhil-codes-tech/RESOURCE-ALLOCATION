import { AppError, ErrorCodes } from '../utils/apiResponse.js';

/**
 * Role-based access control middleware
 * @param {...string} roles - Allowed roles (e.g., 'ADMIN', 'NGO_COORDINATOR')
 * @returns {Function} Express middleware
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required', ErrorCodes.AUTH_REQUIRED));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          `Access denied. Required role(s): ${roles.join(', ')}`,
          ErrorCodes.FORBIDDEN
        )
      );
    }

    next();
  };
}

/**
 * Allow access to resource owner or admin
 * @param {Function} getOwnerId - (req) => ownerId from request
 * @returns {Function}
 */
export function requireOwnerOrAdmin(getOwnerId) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required', ErrorCodes.AUTH_REQUIRED));
    }

    if (req.user.role === 'ADMIN') {
      return next();
    }

    const ownerId = getOwnerId(req);
    if (req.user.id !== ownerId) {
      return next(new AppError(403, 'You can only access your own resources', ErrorCodes.FORBIDDEN));
    }

    next();
  };
}

export default { requireRole, requireOwnerOrAdmin };
