import crypto from 'crypto';
import redis from '../config/redis.js';
import logger from './logger.js';

const OTP_TTL = 300;         // 5 minutes
const OTP_COOLDOWN = 60;     // 60 seconds between sends
const MAX_ATTEMPTS = 3;
const LOCK_DURATION = 1800;  // 30 minutes lock after max attempts

/**
 * Generate a 6-digit OTP
 * @returns {string}
 */
export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Store OTP in Redis with TTL
 * @param {string} identifier - phone or email
 * @param {string} code - OTP code
 * @returns {Promise<{success: boolean, message?: string, retryAfter?: number}>}
 */
export async function storeOTP(identifier, code) {
  const key = `otp:${identifier}`;
  const cooldownKey = `otp_cooldown:${identifier}`;
  const lockKey = `otp_lock:${identifier}`;

  // Check if phone/email is locked
  const locked = await redis.get(lockKey);
  if (locked) {
    const ttl = await redis.ttl(lockKey);
    return {
      success: false,
      message: `Too many failed attempts. Try again after ${Math.ceil(ttl / 60)} minutes.`,
      retryAfter: ttl,
    };
  }

  // Check cooldown (prevent spam)
  const cooldown = await redis.get(cooldownKey);
  if (cooldown) {
    const ttl = await redis.ttl(cooldownKey);
    return {
      success: false,
      message: `OTP already sent. Retry after ${ttl} seconds.`,
      retryAfter: ttl,
    };
  }

  // Store OTP
  const otpData = JSON.stringify({ code, attempts: 0 });
  await redis.setex(key, OTP_TTL, otpData);

  // Set cooldown
  await redis.setex(cooldownKey, OTP_COOLDOWN, '1');

  logger.info(`OTP stored for ${identifier}, expires in ${OTP_TTL}s`);

  return {
    success: true,
    expiresIn: OTP_TTL,
  };
}

/**
 * Verify an OTP
 * @param {string} identifier - phone or email
 * @param {string} code - OTP code to verify
 * @returns {Promise<{valid: boolean, message: string}>}
 */
export async function verifyOTP(identifier, code) {
  const key = `otp:${identifier}`;
  const lockKey = `otp_lock:${identifier}`;

  // Check if locked
  const locked = await redis.get(lockKey);
  if (locked) {
    const ttl = await redis.ttl(lockKey);
    return {
      valid: false,
      message: `Account locked. Try again after ${Math.ceil(ttl / 60)} minutes.`,
    };
  }

  const raw = await redis.get(key);
  if (!raw) {
    return {
      valid: false,
      message: 'OTP expired or not found. Request a new one.',
    };
  }

  const otpData = JSON.parse(raw);

  // Check attempts
  if (otpData.attempts >= MAX_ATTEMPTS) {
    // Lock the identifier
    await redis.setex(lockKey, LOCK_DURATION, '1');
    await redis.del(key);
    logger.warn(`OTP max attempts reached for ${identifier}, locked for ${LOCK_DURATION}s`);
    return {
      valid: false,
      message: 'Too many failed attempts. Account locked for 30 minutes.',
    };
  }

  // Verify code
  if (otpData.code !== code) {
    // Increment attempts
    otpData.attempts += 1;
    const ttl = await redis.ttl(key);
    await redis.setex(key, ttl > 0 ? ttl : OTP_TTL, JSON.stringify(otpData));

    const remaining = MAX_ATTEMPTS - otpData.attempts;
    logger.warn(`Invalid OTP for ${identifier}, ${remaining} attempts remaining`);
    return {
      valid: false,
      message: `Invalid OTP. ${remaining} attempt(s) remaining.`,
    };
  }

  // OTP is valid — delete it
  await redis.del(key);
  logger.info(`OTP verified successfully for ${identifier}`);

  return {
    valid: true,
    message: 'OTP verified successfully.',
  };
}

/**
 * Check if an identifier is locked
 * @param {string} identifier
 * @returns {Promise<boolean>}
 */
export async function isLocked(identifier) {
  const lockKey = `otp_lock:${identifier}`;
  return !!(await redis.get(lockKey));
}

export default { generateOTP, storeOTP, verifyOTP, isLocked };
