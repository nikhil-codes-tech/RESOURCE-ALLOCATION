import Queue from 'bull';
import logger from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const defaultOptions = {
  redis: REDIS_URL,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};

// ── Email Queue ──
export const emailQueue = new Queue('email', {
  ...defaultOptions,
  limiter: {
    max: 14,         // AWS SES limit: 14/second
    duration: 1000,
  },
});

// ── SMS Queue ──
export const smsQueue = new Queue('sms', {
  ...defaultOptions,
  limiter: {
    max: 10,
    duration: 1000,
  },
});

// ── Volunteer Matching Queue ──
export const matchQueue = new Queue('match', {
  ...defaultOptions,
  defaultJobOptions: {
    ...defaultOptions.defaultJobOptions,
    attempts: 2,
    timeout: 30000,
  },
});

// ── Notification Queue ──
export const notificationQueue = new Queue('notification', {
  ...defaultOptions,
  limiter: {
    max: 50,
    duration: 1000,
  },
});

// Global event handlers for all queues
const queues = [emailQueue, smsQueue, matchQueue, notificationQueue];

queues.forEach((queue) => {
  queue.on('completed', (job) => {
    logger.debug(`Job ${job.id} completed in queue "${queue.name}"`);
  });

  queue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed in queue "${queue.name}": ${err.message}`);
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} stalled in queue "${queue.name}"`);
  });

  queue.on('error', (err) => {
    logger.error(`Queue "${queue.name}" error: ${err.message}`);
  });
});

/**
 * Close all queues gracefully
 */
export async function closeQueues() {
  await Promise.all(queues.map((q) => q.close()));
  logger.info('All Bull queues closed');
}

export default { emailQueue, smsQueue, matchQueue, notificationQueue, closeQueues };
