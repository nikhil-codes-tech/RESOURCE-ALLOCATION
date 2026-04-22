import prisma from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Initialize chat socket handlers
 * @param {import('socket.io').Server} io
 */
export function initChatSocket(io) {
  io.on('connection', (socket) => {
    const userId = socket.userId;

    // ── Join team chat room ──
    socket.on('chat:join', async ({ teamId }) => {
      try {
        // Verify membership
        const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
        if (!volunteer) return;

        const member = await prisma.teamMember.findUnique({
          where: { teamId_volunteerId: { teamId, volunteerId: volunteer.id } },
        });
        if (!member) {
          socket.emit('error', { message: 'Not a member of this team' });
          return;
        }

        socket.join(`team:${teamId}`);
        logger.debug(`User ${userId} joined chat room team:${teamId}`);

        // Notify others
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, avatarUrl: true },
        });
        socket.to(`team:${teamId}`).emit('chat:member_join', {
          userId, name: user.name, avatarUrl: user.avatarUrl,
        });
      } catch (err) {
        logger.error(`chat:join error: ${err.message}`);
      }
    });

    // ── Leave team chat room ──
    socket.on('chat:leave', ({ teamId }) => {
      socket.leave(`team:${teamId}`);
      logger.debug(`User ${userId} left chat room team:${teamId}`);

      socket.to(`team:${teamId}`).emit('chat:member_leave', { userId });
    });

    // ── Send message ──
    socket.on('chat:message', async ({ teamId, content, type = 'text' }) => {
      try {
        if (!content || !teamId) return;

        // Save to DB
        const message = await prisma.chatMessage.create({
          data: {
            teamId,
            senderId: userId,
            content,
            type,
            readBy: [userId],
          },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true } },
          },
        });

        // Broadcast to room
        io.to(`team:${teamId}`).emit('chat:message', message);
      } catch (err) {
        logger.error(`chat:message error: ${err.message}`);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Typing indicators ──
    socket.on('chat:typing', async ({ teamId }) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, avatarUrl: true },
        });
        socket.to(`team:${teamId}`).emit('chat:typing', {
          userId, name: user?.name, avatarUrl: user?.avatarUrl,
        });
      } catch (err) {
        logger.error(`chat:typing error: ${err.message}`);
      }
    });

    socket.on('chat:stop_typing', ({ teamId }) => {
      socket.to(`team:${teamId}`).emit('chat:stop_typing', { userId });
    });

    // ── Read receipts ──
    socket.on('chat:read', async ({ teamId, lastMessageId }) => {
      try {
        if (!lastMessageId) return;

        const lastMessage = await prisma.chatMessage.findUnique({
          where: { id: lastMessageId },
        });
        if (!lastMessage) return;

        // Update read_by for all unread messages
        await prisma.$executeRawUnsafe(`
          UPDATE chat_messages
          SET read_by = array_append(read_by, $1)
          WHERE team_id = $2
            AND created_at <= $3
            AND NOT ($1 = ANY(read_by))
        `, userId, teamId, lastMessage.createdAt);

        io.to(`team:${teamId}`).emit('chat:read_receipt', {
          userId, lastMessageId,
        });
      } catch (err) {
        logger.error(`chat:read error: ${err.message}`);
      }
    });
  });

  logger.info('✅ Chat socket handlers initialized');
}

export default { initChatSocket };
