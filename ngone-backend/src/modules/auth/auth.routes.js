import { Router } from 'express';
import passport from 'passport';
import * as authController from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { protect } from '../../middleware/auth.js';
import { loginLimiter, otpLimiter, registerLimiter } from '../../middleware/rateLimiter.js';
import {
  registerSchema, loginSchema, sendOTPSchema, verifyOTPSchema,
  sendEmailOTPSchema, verifyEmailOTPSchema,
  forgotPasswordSchema, resetPasswordSchema, changePasswordSchema,
  refreshTokenSchema,
} from './auth.schema.js';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               role: { type: string, enum: [VOLUNTEER, NGO_COORDINATOR, DONOR] }
 *               phone: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *     responses:
 *       201: { description: Registration successful }
 *       409: { description: Email already exists }
 *       422: { description: Validation error }
 */
router.post('/register', registerLimiter, validate(registerSchema), authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 */
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and invalidate tokens
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/logout', protect, authController.logout);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 */
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// ── Phone OTP ──
router.post('/send-otp', otpLimiter, validate(sendOTPSchema), authController.sendOTP);
router.post('/verify-otp', validate(verifyOTPSchema), authController.verifyOTP);

// ── Email OTP ──
router.post('/send-email-otp', otpLimiter, validate(sendEmailOTPSchema), authController.sendEmailOTP);
router.post('/verify-email-otp', validate(verifyEmailOTPSchema), authController.verifyEmailOTP);

// ── Google OAuth ──
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), authController.googleCallback);

// ── Microsoft OAuth ──
router.get('/microsoft', passport.authenticate('microsoft', { scope: ['user.read'], session: false }));
router.get('/microsoft/callback', passport.authenticate('microsoft', { session: false, failureRedirect: '/login' }), authController.microsoftCallback);

// ── Password ──
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/change-password', protect, validate(changePasswordSchema), authController.changePassword);

// ── Current User ──
router.get('/me', protect, authController.getMe);

export default router;
