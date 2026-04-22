import { AppError } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Global error handler middleware
 * Must be the last middleware registered
 */
export function errorHandler(err, req, res, next) {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || null;

  // ── Prisma Errors ──
  if (err.code === 'P2002') {
    statusCode = 409;
    const field = err.meta?.target?.[0] || 'field';
    message = `A record with this ${field} already exists`;
    code = 'DUPLICATE_ENTRY';
    details = { field };
  }

  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
    code = 'NOT_FOUND';
  }

  if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Related record not found';
    code = 'VALIDATION_ERROR';
  }

  // ── JWT Errors ──
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'TOKEN_INVALID';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }

  // ── Multer Errors ──
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File too large. Maximum size is 10MB';
    code = 'VALIDATION_ERROR';
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    statusCode = 400;
    message = 'Too many files uploaded';
    code = 'VALIDATION_ERROR';
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
    code = 'VALIDATION_ERROR';
  }

  // ── Zod Errors ──
  if (err.name === 'ZodError') {
    statusCode = 422;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = err.issues?.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
  }

  // ── Log Error ──
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}`, {
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    });
  } else if (statusCode >= 400) {
    logger.warn(`${statusCode} - ${message}`, {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    });
  }

  // ── Build Response ──
  const response = {
    success: false,
    error: message,
    code,
  };

  if (details) {
    response.details = details;
  }

  // Never expose stack trace in production
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
  });
}

export default { errorHandler, notFoundHandler };
