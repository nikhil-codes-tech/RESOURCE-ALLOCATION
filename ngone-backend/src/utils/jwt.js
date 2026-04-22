import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev-access-secret-change-me-in-production-32chars';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-change-me-in-production-32chars';

/**
 * Sign an access token (short-lived, 15 min default)
 * @param {object} payload - { sub: userId, role, email }
 * @returns {string}
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m',
    issuer: 'ngone-backend',
    audience: 'ngone-client',
  });
}

/**
 * Sign a refresh token (long-lived, 7 day default)
 * @param {object} payload - { sub: userId }
 * @returns {string}
 */
export function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d',
    issuer: 'ngone-backend',
    audience: 'ngone-client',
  });
}

/**
 * Sign a password reset token (1 hour)
 * @param {string} userId
 * @returns {string}
 */
export function signResetToken(userId) {
  return jwt.sign(
    { sub: userId, type: 'reset' },
    ACCESS_SECRET,
    { expiresIn: process.env.RESET_TOKEN_EXPIRES || '1h' }
  );
}

/**
 * Verify an access token
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET, {
    issuer: 'ngone-backend',
    audience: 'ngone-client',
  });
}

/**
 * Verify a refresh token
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET, {
    issuer: 'ngone-backend',
    audience: 'ngone-client',
  });
}

/**
 * Verify a reset token
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyResetToken(token) {
  const payload = jwt.verify(token, ACCESS_SECRET);
  if (payload.type !== 'reset') {
    throw new Error('Invalid token type');
  }
  return payload;
}

/**
 * Decode token without verification (for debugging)
 * @param {string} token
 * @returns {object|null}
 */
export function decodeToken(token) {
  return jwt.decode(token);
}

export default {
  signAccessToken,
  signRefreshToken,
  signResetToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyResetToken,
  decodeToken,
};
