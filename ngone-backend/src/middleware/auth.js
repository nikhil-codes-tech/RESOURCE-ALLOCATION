import { verifyAccessToken } from '../utils/jwt.js';
import { AppError, ErrorCodes } from '../utils/apiResponse.js';
import redis from '../config/redis.js';
import prisma from '../config/database.js';

/**
 * Protect routes — verify JWT, check blacklist, attach req.user
 */
export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided', ErrorCodes.AUTH_REQUIRED);
    }

    const token = header.split(' ')[1];

    // Verify token
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError(401, 'Token expired', ErrorCodes.TOKEN_EXPIRED);
      }
      throw new AppError(401, 'Invalid token', ErrorCodes.TOKEN_INVALID);
    }

    // Check if token is blacklisted
    const blacklisted = await redis.get(`bl:${token}`);
    if (blacklisted) {
      throw new AppError(401, 'Token revoked', ErrorCodes.TOKEN_INVALID);
    }

    // Find user with role-specific relations
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        volunteer: true,
        ngo: true,
        donor: true,
      },
    });

    if (!user) {
      throw new AppError(401, 'User not found', ErrorCodes.AUTH_REQUIRED);
    }

    if (!user.isActive) {
      throw new AppError(401, 'Account deactivated', ErrorCodes.ACCOUNT_INACTIVE);
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional auth — same as protect but doesn't throw if no token
 * Used for public routes that behave differently for logged-in users
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = header.split(' ')[1];

    try {
      const payload = verifyAccessToken(token);
      const blacklisted = await redis.get(`bl:${token}`);
      if (blacklisted) {
        req.user = null;
        return next();
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          volunteer: true,
          ngo: true,
          donor: true,
        },
      });

      req.user = user && user.isActive ? user : null;
    } catch {
      req.user = null;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default { protect, optionalAuth };
