import { catchAsync } from '../../utils/catchAsync.js';
import { successResponse } from '../../utils/apiResponse.js';
import * as authService from './auth.service.js';

export const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body, req);
  successResponse(res, 201, 'Registration successful', result);
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, req);
  successResponse(res, 200, 'Login successful', result);
});

export const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(req.token, refreshToken);
  successResponse(res, 200, 'Logged out successfully');
});

export const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshTokens(refreshToken, req);
  successResponse(res, 200, 'Token refreshed', result);
});

export const sendOTP = catchAsync(async (req, res) => {
  const result = await authService.sendPhoneOTP(req.body.phone);
  successResponse(res, 200, result.message, { expiresIn: result.expiresIn });
});

export const verifyOTP = catchAsync(async (req, res) => {
  const { phone, code } = req.body;
  const result = await authService.verifyPhoneOTP(phone, code, req);
  successResponse(res, 200, 'OTP verified', result);
});

export const sendEmailOTP = catchAsync(async (req, res) => {
  const result = await authService.sendEmailOTP(req.body.email);
  successResponse(res, 200, result.message, { expiresIn: result.expiresIn });
});

export const verifyEmailOTP = catchAsync(async (req, res) => {
  const { email, code } = req.body;
  const result = await authService.verifyEmailOTP(email, code);
  successResponse(res, 200, result.message);
});

export const googleCallback = catchAsync(async (req, res) => {
  const result = await authService.googleCallback(req.user, req);
  // Redirect to frontend with tokens
  const params = new URLSearchParams({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  res.redirect(`${process.env.CLIENT_URL}/auth/callback?${params}`);
});

export const microsoftCallback = catchAsync(async (req, res) => {
  const result = await authService.microsoftCallback(req.user, req);
  const params = new URLSearchParams({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  res.redirect(`${process.env.CLIENT_URL}/auth/callback?${params}`);
});

export const forgotPassword = catchAsync(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  successResponse(res, 200, result.message);
});

export const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;
  const result = await authService.resetPassword(token, password);
  successResponse(res, 200, result.message);
});

export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
  successResponse(res, 200, result.message);
});

export const getMe = catchAsync(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  successResponse(res, 200, 'User profile fetched', { user });
});

export default {
  register, login, logout, refresh,
  sendOTP, verifyOTP, sendEmailOTP, verifyEmailOTP,
  googleCallback, microsoftCallback,
  forgotPassword, resetPassword, changePassword, getMe,
};
