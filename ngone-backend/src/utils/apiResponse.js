/**
 * Standardized API response helpers
 */

/**
 * Send a success response
 * @param {import('express').Response} res
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {object} [data] - Response data
 * @param {object} [meta] - Pagination/extra metadata
 */
export function successResponse(res, statusCode, message, data = null, meta = null) {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send an error response
 * @param {import('express').Response} res
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Error message
 * @param {string} [code] - Error code (e.g. VALIDATION_ERROR)
 * @param {object} [details] - Error details
 */
export function errorResponse(res, statusCode, error, code = null, details = null) {
  const response = {
    success: false,
    error,
  };

  if (code) {
    response.code = code;
  }

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(statusCode, message, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error codes
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  PHONE_LOCKED: 'PHONE_LOCKED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SIGNATURE_MISMATCH: 'SIGNATURE_MISMATCH',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RATE_LIMITED: 'RATE_LIMITED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
};

export default { successResponse, errorResponse, AppError, ErrorCodes };
