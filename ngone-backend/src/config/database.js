import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
    errorFormat: 'pretty',
  });

// Log slow queries in development
prisma.$on('query', (e) => {
  if (e.duration > 500) {
    logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
  }
});

prisma.$on('error', (e) => {
  logger.error(`Prisma error: ${e.message}`);
});

prisma.$on('warn', (e) => {
  logger.warn(`Prisma warning: ${e.message}`);
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connected successfully');
    return true;
  } catch (error) {
    logger.error(`❌ Database connection failed: ${error.message}`);
    return false;
  }
}

/**
 * Disconnect from database
 */
export async function disconnect() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

export default prisma;
