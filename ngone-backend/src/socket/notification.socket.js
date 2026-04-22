import prisma from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Initialize notification socket handlers
 * @param {import('socket.io').Server} io
 */
export function initNotificationSocket(io) {
  io.on('connection', async (socket) => {
    const userId = socket.userId;

    // User already joins `user:${userId}` room in config/socket.js
    // Send unread count on connect
    try {
      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });
      socket.emit('notification:count', { count: unreadCount });
    } catch (err) {
      logger.error(`notification:count error: ${err.message}`);
    }

    // ── Mark notification as read ──
    socket.on('notification:read', async ({ notificationId }) => {
      try {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { isRead: true, readAt: new Date() },
        });

        const unreadCount = await prisma.notification.count({
          where: { userId, isRead: false },
        });
        socket.emit('notification:count', { count: unreadCount });
      } catch (err) {
        logger.error(`notification:read error: ${err.message}`);
      }
    });

    // ── Mark all as read ──
    socket.on('notification:read_all', async () => {
      try {
        await prisma.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true, readAt: new Date() },
        });
        socket.emit('notification:count', { count: 0 });
      } catch (err) {
        logger.error(`notification:read_all error: ${err.message}`);
      }
    });

    // ── Update online status ──
    socket.on('disconnect', async () => {
      try {
        await prisma.volunteer.updateMany({
          where: { userId },
          data: { isOnline: false, lastActiveAt: new Date() },
        });
      } catch (err) {
        // Volunteer may not exist for non-volunteer users
      }
    });

    // Mark volunteer as online on connect
    try {
      await prisma.volunteer.updateMany({
        where: { userId },
        data: { isOnline: true, lastActiveAt: new Date() },
      });
    } catch (err) {
      // Non-volunteer users skip this
    }
  });

  logger.info('✅ Notification socket handlers initialized');
}

/**
 * Send a notification to a specific user via socket
 * @param {import('socket.io').Server} io
 * @param {string} userId
 * @param {object} notification
 */
export async function pushNotification(io, userId, notification) {
  try {
    const saved = await prisma.notification.create({
      data: { userId, ...notification },
    });

    io.to(`user:${userId}`).emit('notification:new', saved);

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    io.to(`user:${userId}`).emit('notification:count', { count: unreadCount });

    return saved;
  } catch (err) {
    logger.error(`pushNotification error: ${err.message}`);
  }
}

export default { initNotificationSocket, pushNotification };
