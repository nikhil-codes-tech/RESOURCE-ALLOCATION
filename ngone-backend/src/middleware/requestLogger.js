import morgan from 'morgan';
import logger from '../utils/logger.js';

// Custom Morgan token for response time coloring
morgan.token('status-colored', (req, res) => {
  const status = res.statusCode;
  if (status >= 500) return `\x1b[31m${status}\x1b[0m`;
  if (status >= 400) return `\x1b[33m${status}\x1b[0m`;
  if (status >= 300) return `\x1b[36m${status}\x1b[0m`;
  return `\x1b[32m${status}\x1b[0m`;
});

// Custom Morgan token for user ID
morgan.token('user-id', (req) => req.user?.id || 'anonymous');

// Stream to pipe Morgan output to Winston
const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Skip logging in test environment
const skip = () => process.env.NODE_ENV === 'test';

/**
 * HTTP request logger middleware
 * Format: :method :url :status :response-time ms - :res[content-length]
 */
export const requestLogger = morgan(
  ':method :url :status-colored :response-time ms - :res[content-length] - :user-id',
  { stream, skip }
);

export default requestLogger;
