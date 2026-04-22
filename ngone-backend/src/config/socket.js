import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

let io;

/**
 * Initialize Socket.io server with JWT auth middleware
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // JWT Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.userId = payload.sub;
      socket.userRole = payload.role;
      next();
    } catch (err) {
      logger.warn(`Socket auth failed: ${err.message}`);
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`Socket connected: user=${userId}, socketId=${socket.id}`);

    // Join personal room for targeted notifications
    socket.join(`user:${userId}`);

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: user=${userId}, reason=${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error: user=${userId}, error=${error.message}`);
    });
  });

  logger.info('✅ Socket.io initialized');
  return io;
}

/**
 * Get the Socket.io server instance
 * @returns {Server}
 */
export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket() first.');
  }
  return io;
}

export default { initSocket, getIO };
