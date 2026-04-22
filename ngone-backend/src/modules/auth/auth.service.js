import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../config/database.js';
import redis from '../../config/redis.js';
import { signAccessToken, signRefreshToken, signResetToken, verifyRefreshToken, verifyResetToken } from '../../utils/jwt.js';
import { generateOTP, storeOTP, verifyOTP as verifyOTPUtil } from '../../utils/otp.js';
import { AppError, ErrorCodes } from '../../utils/apiResponse.js';
import { emailQueue, smsQueue } from '../../config/queue.js';
import logger from '../../utils/logger.js';

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION = 900; // 15 minutes

/**
 * Generate JWT pair for a user
 */
function generateTokenPair(user) {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });
  const refreshToken = signRefreshToken({ sub: user.id });
  return { accessToken, refreshToken };
}

/**
 * Store refresh token in database
 */
async function storeRefreshToken(userId, token, req) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({
    data: {
      userId,
      token: crypto.createHash('sha256').update(token).digest('hex'),
      expiresAt,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    },
  });
}

/**
 * Sanitize user object for response (remove sensitive fields)
 */
function sanitizeUser(user) {
  const { passwordHash, failedLoginCount, lockedUntil, ...safeUser } = user;
  return safeUser;
}

// ─── Register ───────────────────────────────────────────
export async function register(data, req) {
  const { name, email, password, role, phone, city, state } = data;

  // Check email uniqueness
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    throw new AppError(409, 'Email already registered', ErrorCodes.DUPLICATE_ENTRY);
  }

  // Check phone uniqueness if provided
  if (phone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new AppError(409, 'Phone number already registered', ErrorCodes.DUPLICATE_ENTRY);
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user + role record in transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role,
        provider: 'EMAIL',
        city,
        state,
        country: 'India',
      },
    });

    // Create role-specific record
    switch (role) {
      case 'VOLUNTEER':
        await tx.volunteer.create({
          data: { userId: newUser.id },
        });
        break;
      case 'NGO_COORDINATOR':
        // NGO record will be created separately via NGO module
        break;
      case 'DONOR':
        await tx.donor.create({
          data: { userId: newUser.id },
        });
        break;
    }

    return newUser;
  });

  // Generate tokens
  const tokens = generateTokenPair(user);
  await storeRefreshToken(user.id, tokens.refreshToken, req);

  // Queue welcome email
  if (user.email) {
    await emailQueue.add('welcome', {
      to: user.email,
      data: { name: user.name, role: user.role, loginUrl: `${process.env.CLIENT_URL}/login` },
    });
  }

  logger.info(`User registered: ${user.id} (${user.role})`);

  return {
    ...tokens,
    user: sanitizeUser(user),
  };
}

// ─── Login ─────────────────────────────────────────────
export async function login(email, password, req) {
  const lockKey = `login_lock:${email}`;
  const attemptKey = `login_attempts:${email}`;

  // Check if account is locked
  const locked = await redis.get(lockKey);
  if (locked) {
    const ttl = await redis.ttl(lockKey);
    throw new AppError(429, `Account locked. Try again in ${Math.ceil(ttl / 60)} minutes.`, ErrorCodes.ACCOUNT_LOCKED);
  }

  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    // Increment failed attempts even for non-existent users (prevent enumeration)
    await redis.incr(attemptKey);
    await redis.expire(attemptKey, LOGIN_LOCK_DURATION);
    throw new AppError(401, 'Invalid email or password', ErrorCodes.AUTH_REQUIRED);
  }

  if (!user.isActive) {
    throw new AppError(401, 'Account deactivated. Contact support.', ErrorCodes.ACCOUNT_INACTIVE);
  }

  // Compare password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const attempts = await redis.incr(attemptKey);
    await redis.expire(attemptKey, LOGIN_LOCK_DURATION);

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await redis.setex(lockKey, LOGIN_LOCK_DURATION, '1');
      await redis.del(attemptKey);
      logger.warn(`Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts: ${email}`);
      throw new AppError(429, 'Too many failed attempts. Account locked for 15 minutes.', ErrorCodes.ACCOUNT_LOCKED);
    }

    const remaining = MAX_LOGIN_ATTEMPTS - attempts;
    throw new AppError(401, `Invalid email or password. ${remaining} attempt(s) remaining.`, ErrorCodes.AUTH_REQUIRED);
  }

  // Success — reset attempts
  await redis.del(attemptKey);
  await redis.del(lockKey);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginCount: 0 },
  });

  // Fetch with relations
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { volunteer: true, ngo: true, donor: true },
  });

  const tokens = generateTokenPair(fullUser);
  await storeRefreshToken(fullUser.id, tokens.refreshToken, req);

  logger.info(`User logged in: ${fullUser.id}`);

  return {
    ...tokens,
    user: sanitizeUser(fullUser),
  };
}

// ─── Logout ────────────────────────────────────────────
export async function logout(accessToken, refreshToken) {
  // Blacklist access token in Redis (TTL = remaining token life, max 15 min)
  if (accessToken) {
    await redis.setex(`bl:${accessToken}`, 900, '1');
  }

  // Revoke refresh token
  if (refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.updateMany({
      where: { token: tokenHash },
      data: { revoked: true, revokedAt: new Date() },
    });
  }
}

// ─── Refresh Token ─────────────────────────────────────
export async function refreshTokens(oldRefreshToken, req) {
  // Verify the refresh token
  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token', ErrorCodes.TOKEN_INVALID);
  }

  // Check in database
  const tokenHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');
  const storedToken = await prisma.refreshToken.findFirst({
    where: { token: tokenHash, revoked: false },
  });

  if (!storedToken) {
    // Possible token reuse attack — revoke all tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId: payload.sub },
      data: { revoked: true, revokedAt: new Date() },
    });
    logger.warn(`Refresh token reuse detected for user: ${payload.sub}`);
    throw new AppError(401, 'Token reuse detected. All sessions revoked.', ErrorCodes.TOKEN_INVALID);
  }

  if (storedToken.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token expired', ErrorCodes.TOKEN_EXPIRED);
  }

  // Revoke old token (rotation)
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true, revokedAt: new Date() },
  });

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { volunteer: true, ngo: true, donor: true },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'User not found or inactive', ErrorCodes.AUTH_REQUIRED);
  }

  // Issue new pair
  const tokens = generateTokenPair(user);
  await storeRefreshToken(user.id, tokens.refreshToken, req);

  return {
    ...tokens,
    user: sanitizeUser(user),
  };
}

// ─── Send Phone OTP ─────────────────────────────────────
export async function sendPhoneOTP(phone) {
  const code = generateOTP();
  const result = await storeOTP(phone, code);

  if (!result.success) {
    throw new AppError(429, result.message, ErrorCodes.RATE_LIMITED);
  }

  // Queue SMS job
  if (process.env.ENABLE_SMS !== 'false') {
    await smsQueue.add('otp_sms', {
      phone,
      code,
      message: `Your NGone OTP is ${code}. Valid for 5 mins. Do not share. -NGONE`,
    });
  }

  logger.info(`OTP sent to phone: ${phone.substring(0, 4)}****`);

  return {
    message: 'OTP sent successfully',
    expiresIn: result.expiresIn,
  };
}

// ─── Verify Phone OTP ──────────────────────────────────
export async function verifyPhoneOTP(phone, code, req) {
  const result = await verifyOTPUtil(phone, code);

  if (!result.valid) {
    const statusCode = result.message.includes('locked') ? 429 : 400;
    const errorCode = result.message.includes('expired') ? ErrorCodes.OTP_EXPIRED :
      result.message.includes('locked') ? ErrorCodes.OTP_MAX_ATTEMPTS : ErrorCodes.OTP_INVALID;
    throw new AppError(statusCode, result.message, errorCode);
  }

  // Upsert user by phone
  let user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    // Create new user
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: `User-${phone.substring(6)}`,
          phone,
          role: 'VOLUNTEER',
          provider: 'PHONE',
          isVerified: true,
          country: 'India',
        },
      });
      await tx.volunteer.create({ data: { userId: newUser.id } });
      return newUser;
    });
  } else {
    // Mark phone as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, lastLoginAt: new Date() },
    });
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { volunteer: true, ngo: true, donor: true },
  });

  const tokens = generateTokenPair(fullUser);
  await storeRefreshToken(fullUser.id, tokens.refreshToken, req);

  return {
    ...tokens,
    user: sanitizeUser(fullUser),
    isNewUser: !user.email,
  };
}

// ─── Send Email OTP ─────────────────────────────────────
export async function sendEmailOTP(email) {
  const code = generateOTP();
  const result = await storeOTP(email, code);

  if (!result.success) {
    throw new AppError(429, result.message, ErrorCodes.RATE_LIMITED);
  }

  // Queue email job
  if (process.env.ENABLE_EMAIL !== 'false') {
    const user = await prisma.user.findUnique({ where: { email } });
    await emailQueue.add('otp_email', {
      to: email,
      data: { name: user?.name || 'User', otp: code, expiresInMinutes: 5 },
    });
  }

  return {
    message: 'OTP sent to email',
    expiresIn: result.expiresIn,
  };
}

// ─── Verify Email OTP ──────────────────────────────────
export async function verifyEmailOTP(email, code) {
  const result = await verifyOTPUtil(email, code);

  if (!result.valid) {
    const statusCode = result.message.includes('locked') ? 429 : 400;
    throw new AppError(statusCode, result.message, ErrorCodes.OTP_INVALID);
  }

  // Mark email verified
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });
  }

  return { message: 'Email verified successfully' };
}

// ─── Google OAuth Callback ─────────────────────────────
export async function googleCallback(profile, req) {
  const { id: googleId, emails, displayName, photos } = profile;
  const email = emails?.[0]?.value;
  const avatarUrl = photos?.[0]?.value;

  // Upsert user
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, ...(email ? [{ email }] : [])] },
  });

  if (!user) {
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: displayName,
          email,
          googleId,
          avatarUrl,
          role: 'VOLUNTEER',
          provider: 'GOOGLE',
          isVerified: true,
          country: 'India',
        },
      });
      await tx.volunteer.create({ data: { userId: newUser.id } });
      return newUser;
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: googleId,
        avatarUrl: avatarUrl || user.avatarUrl,
        isVerified: true,
        lastLoginAt: new Date(),
      },
    });
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { volunteer: true, ngo: true, donor: true },
  });

  const tokens = generateTokenPair(fullUser);
  await storeRefreshToken(fullUser.id, tokens.refreshToken, req);

  return { ...tokens, user: sanitizeUser(fullUser) };
}

// ─── Microsoft OAuth Callback ──────────────────────────
export async function microsoftCallback(profile, req) {
  const { id: microsoftId, emails, displayName, photos } = profile;
  const email = emails?.[0]?.value;
  const avatarUrl = photos?.[0]?.value;

  let user = await prisma.user.findFirst({
    where: { OR: [{ microsoftId }, ...(email ? [{ email }] : [])] },
  });

  if (!user) {
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: displayName,
          email,
          microsoftId,
          avatarUrl,
          role: 'VOLUNTEER',
          provider: 'MICROSOFT',
          isVerified: true,
          country: 'India',
        },
      });
      await tx.volunteer.create({ data: { userId: newUser.id } });
      return newUser;
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        microsoftId,
        isVerified: true,
        lastLoginAt: new Date(),
      },
    });
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { volunteer: true, ngo: true, donor: true },
  });

  const tokens = generateTokenPair(fullUser);
  await storeRefreshToken(fullUser.id, tokens.refreshToken, req);

  return { ...tokens, user: sanitizeUser(fullUser) };
}

// ─── Forgot Password ───────────────────────────────────
export async function forgotPassword(email) {
  // Always return same response (prevent enumeration)
  const successMessage = 'If an account exists with this email, a password reset link has been sent.';

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { message: successMessage };
  }

  // Generate reset token
  const resetToken = signResetToken(user.id);
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Store in Redis (1 hour TTL)
  await redis.setex(`reset:${user.id}`, 3600, tokenHash);

  // Queue reset email
  if (process.env.ENABLE_EMAIL !== 'false') {
    await emailQueue.add('password_reset', {
      to: user.email,
      data: {
        name: user.name,
        resetUrl: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`,
        expiresIn: '1 hour',
      },
    });
  }

  logger.info(`Password reset requested for: ${user.id}`);

  return { message: successMessage };
}

// ─── Reset Password ────────────────────────────────────
export async function resetPassword(token, newPassword) {
  // Verify token
  let payload;
  try {
    payload = verifyResetToken(token);
  } catch {
    throw new AppError(400, 'Invalid or expired reset token', ErrorCodes.TOKEN_INVALID);
  }

  // Check token hash in Redis
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const storedHash = await redis.get(`reset:${payload.sub}`);

  if (!storedHash || storedHash !== tokenHash) {
    throw new AppError(400, 'Reset link already used or expired', ErrorCodes.TOKEN_INVALID);
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password
  await prisma.user.update({
    where: { id: payload.sub },
    data: { passwordHash },
  });

  // Delete Redis key (prevent reuse)
  await redis.del(`reset:${payload.sub}`);

  // Revoke all refresh tokens
  await prisma.refreshToken.updateMany({
    where: { userId: payload.sub },
    data: { revoked: true, revokedAt: new Date() },
  });

  logger.info(`Password reset completed for: ${payload.sub}`);

  return { message: 'Password reset successful. Please login with your new password.' };
}

// ─── Change Password ───────────────────────────────────
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) {
    throw new AppError(400, 'Cannot change password for OAuth accounts');
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError(400, 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Revoke all refresh tokens except current
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { revoked: true, revokedAt: new Date() },
  });

  return { message: 'Password changed successfully. Please login again.' };
}

// ─── Get Current User ──────────────────────────────────
export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      volunteer: { include: { badges: true } },
      ngo: true,
      donor: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found', ErrorCodes.NOT_FOUND);
  }

  return sanitizeUser(user);
}

export default {
  register,
  login,
  logout,
  refreshTokens,
  sendPhoneOTP,
  verifyPhoneOTP,
  sendEmailOTP,
  verifyEmailOTP,
  googleCallback,
  microsoftCallback,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
};
