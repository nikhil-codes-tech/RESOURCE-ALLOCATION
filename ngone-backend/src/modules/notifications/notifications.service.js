import prisma from '../../config/database.js';
import { getOffsetPagination, buildPaginationMeta } from '../../utils/paginate.js';
import { getIO } from '../../config/socket.js';

export async function listNotifications(userId, query) {
  const { skip, take, page, limit } = getOffsetPagination(query);
  const where = { userId };

  if (query.unread === 'true') where.isRead = false;
  if (query.type) where.type = query.type;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications,
    unreadCount,
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function markAsRead(userId, notificationIds) {
  if (notificationIds && notificationIds.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId },
      data: { isRead: true, readAt: new Date() },
    });
  } else {
    // Mark all as read
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('notification:count', { count: unreadCount });
  } catch (e) { /* ignore */ }

  return { unreadCount };
}

export async function createNotification(userId, data) {
  const notification = await prisma.notification.create({
    data: { userId, ...data },
  });

  // Emit real-time notification
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('notification:new', notification);

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    io.to(`user:${userId}`).emit('notification:count', { count: unreadCount });
  } catch (e) { /* ignore */ }

  return notification;
}

export async function deleteNotification(id, userId) {
  await prisma.notification.deleteMany({ where: { id, userId } });
  return { message: 'Notification deleted' };
}

export async function getUnreadCount(userId) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return { count };
}

export default { listNotifications, markAsRead, createNotification, deleteNotification, getUnreadCount };
