// ─────────────────────────────────────────────────────────
// NG😊NE — Auth API Service
// ─────────────────────────────────────────────────────────
import api from './client.js';

const API_URL = import.meta.env.VITE_API_URL || '';

export const register       = (data)  => api.post('/auth/register', data);
export const login           = (data)  => api.post('/auth/login', data);
export const logout          = ()      => api.post('/auth/logout');
export const getMe           = ()      => api.get('/auth/me');

// OTP — Phone
export const sendOTP         = (phone) => api.post('/auth/send-otp', { phone });
export const verifyOTP       = (data)  => api.post('/auth/verify-otp', data);

// OTP — Email
export const sendEmailOTP    = (email) => api.post('/auth/send-email-otp', { email });
export const verifyEmailOTP  = (data)  => api.post('/auth/verify-email-otp', data);

// Password
export const forgotPassword  = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword   = (data)  => api.post('/auth/reset-password', data);

// Social auth — redirect to backend OAuth flow
export const googleLogin     = () => {
  window.location.href = `${API_URL}/auth/google`;
};

export const microsoftLogin  = () => {
  window.location.href = `${API_URL}/auth/microsoft`;
};
