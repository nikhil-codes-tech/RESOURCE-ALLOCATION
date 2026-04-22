/**
 * Async error wrapper for Express route handlers
 * Catches promise rejections and forwards to error middleware
 *
 * @param {Function} fn - Async route handler (req, res, next) => Promise
 * @returns {Function} Express middleware
 */
export function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default catchAsync;
