import { createServer } from 'http';
import app from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import { initSocket } from './config/socket.js';
import prisma from './config/database.js';
import redis from './config/redis.js';
import { registerProcessors } from './jobs/index.js';

// ── Create HTTP server ──────────────────────────────────────────
const httpServer = createServer(app);

// ── Initialize Socket.io ────────────────────────────────────────
let io = null;
if (env.ENABLE_SOCKET) {
  io = initSocket(httpServer);
  logger.info('✅ Socket.io initialized');
}

// ── Register Bull job processors ────────────────────────────────
registerProcessors();
logger.info('✅ Bull job processors registered');

// ── Graceful shutdown handler ───────────────────────────────────
const gracefulShutdown = async (signal) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Disconnect Prisma
      await prisma.$disconnect();
      logger.info('PostgreSQL disconnected');

      // Disconnect Redis
      await redis.quit();
      logger.info('Redis disconnected');

      // Close Socket.io
      if (io) {
        io.close();
        logger.info('Socket.io closed');
      }

      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after 30s timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── Start server ────────────────────────────────────────────────
const PORT = env.PORT;

httpServer.listen(PORT, async () => {
  logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   NG😊NE API Server                                       ║
║                                                            ║
║   Environment : ${env.NODE_ENV.padEnd(40)}║
║   Port        : ${String(PORT).padEnd(40)}║
║   API Prefix  : ${env.API_PREFIX.padEnd(40)}║
║   Docs        : http://localhost:${PORT}${env.API_PREFIX}/docs${' '.repeat(Math.max(0, 16 - String(PORT).length))}║
║   Health      : http://localhost:${PORT}${env.API_PREFIX}/health${' '.repeat(Math.max(0, 14 - String(PORT).length))}║
║   Socket.io   : ${(env.ENABLE_SOCKET ? 'enabled' : 'disabled').padEnd(40)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ PostgreSQL connected');
  } catch (error) {
    logger.error('❌ PostgreSQL connection failed:', error.message);
  }

  // Test Redis connection
  try {
    const pong = await redis.ping();
    if (pong === 'PONG') {
      logger.info('✅ Redis connected');
    }
  } catch (error) {
    logger.error('❌ Redis connection failed:', error.message);
  }
});

export { httpServer, io };
