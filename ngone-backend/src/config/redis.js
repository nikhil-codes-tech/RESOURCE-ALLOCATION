import Redis from 'ioredis';
import logger from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    logger.warn(`Redis reconnecting... attempt ${times}, delay ${delay}ms`);
    return delay;
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET', 'EPIPE'];
    return targetErrors.some((e) => err.message.includes(e));
  },
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  logger.error(`❌ Redis error: ${err.message}`);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

/**
 * Test Redis connection
 * @returns {Promise<boolean>}
 */
export async function testRedisConnection() {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error(`Redis health check failed: ${error.message}`);
    return false;
  }
}

/**
 * Store a value with optional TTL
 * @param {string} key
 * @param {string|object} value
 * @param {number} [ttlSeconds]
 */
export async function setWithTTL(key, value, ttlSeconds) {
  const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

/**
 * Get and parse a value
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getJSON(key) {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export default redis;
