import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../config/redis.js';

/**
 * Create a Redis-backed rate limiter
 * @param {object} options
 * @returns {Function} Express middleware
 */
function createLimiter(options) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    prefix = 'rl',
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator: keyGenerator || ((req) => req.ip),
    message: {
      success: false,
      error: message,
      code: 'RATE_LIMITED',
    },
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: `${prefix}:`,
    }),
  });
}

// ── General API limiter: 100 req/IP/min ──
export const apiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests. Limit: 100 per minute.',
  prefix: 'rl:api',
});

// ── OTP limiter: 3 requests per phone per 10 min ──
export const otpLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: 'Too many OTP requests. Try again in 10 minutes.',
  keyGenerator: (req) => req.body.phone || req.body.email || req.ip,
  prefix: 'rl:otp',
});

// ── Login limiter: 5 failed attempts per 15 min ──
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Account locked for 15 minutes.',
  skipSuccessfulRequests: true,
  prefix: 'rl:login',
});

// ── Donation limiter: 10 per hour per user ──
export const donationLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many donation attempts. Limit: 10 per hour.',
  keyGenerator: (req) => req.user?.id || req.ip,
  prefix: 'rl:donation',
});

// ── Upload limiter: 20 per minute ──
export const uploadLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many uploads. Limit: 20 per minute.',
  prefix: 'rl:upload',
});

// ── Registration limiter: 3 per hour per IP ──
export const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many registration attempts. Try again in 1 hour.',
  prefix: 'rl:register',
});

export default {
  apiLimiter,
  otpLimiter,
  loginLimiter,
  donationLimiter,
  uploadLimiter,
  registerLimiter,
};
