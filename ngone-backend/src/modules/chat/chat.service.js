import prisma from '../../config/database.js';
import { AppError, ErrorCodes } from '../../utils/apiResponse.js';
import { getCursorPagination, buildCursorMeta } from '../../utils/paginate.js';

async function verifyTeamMember(teamId, userId) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
  if (!volunteer) throw new AppError(403, 'Not a volunteer');

  const member = await prisma.teamMember.findUnique({
    where: { teamId_volunteerId: { teamId, volunteerId: volunteer.id } },
  });
  if (!member) throw new AppError(403, 'Not a member of this team');
  return { volunteer, member };
}

export async function getMessages(teamId, userId, query) {
  await verifyTeamMember(teamId, userId);

  const pagination = getCursorPagination(query);
  const messages = await prisma.chatMessage.findMany({
    where: { teamId, isDeleted: false },
    ...pagination,
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return {
    messages: messages.reverse(),
    meta: buildCursorMeta(messages, pagination.take),
  };
}

export async function sendMessage(teamId, userId, data) {
  await verifyTeamMember(teamId, userId);

  const message = await prisma.chatMessage.create({
    data: {
      teamId,
      senderId: userId,
      content: data.content,
      type: data.type || 'text',
      readBy: [userId],
    },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return message;
}

export async function uploadFile(teamId, userId, fileUrl, fileName) {
  await verifyTeamMember(teamId, userId);

  const message = await prisma.chatMessage.create({
    data: {
      teamId,
      senderId: userId,
      content: fileName || 'File attachment',
      type: 'file',
      fileUrl,
      fileName,
      readBy: [userId],
    },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return message;
}

export async function editMessage(messageId, userId, content) {
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message) throw new AppError(404, 'Message not found');
  if (message.senderId !== userId) throw new AppError(403, 'Can only edit your own messages');

  // 15 minute edit window
  const fifteenMinutes = 15 * 60 * 1000;
  if (Date.now() - message.createdAt.getTime() > fifteenMinutes) {
    throw new AppError(400, 'Messages can only be edited within 15 minutes');
  }

  return prisma.chatMessage.update({
    where: { id: messageId },
    data: { content, isEdited: true, editedAt: new Date() },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

export async function deleteMessage(messageId, userId) {
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message) throw new AppError(404, 'Message not found');
  if (message.senderId !== userId) throw new AppError(403, 'Can only delete your own messages');

  return prisma.chatMessage.update({
    where: { id: messageId },
    data: { isDeleted: true, content: 'This message was deleted' },
  });
}

export async function getOnlineMembers(teamId, userId) {
  await verifyTeamMember(teamId, userId);

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: {
      volunteer: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        select: { isOnline: true, lastActiveAt: true, user: true },
      },
    },
  });

  return members.map((m) => ({
    userId: m.volunteer.user.id,
    name: m.volunteer.user.name,
    avatarUrl: m.volunteer.user.avatarUrl,
    isOnline: m.volunteer.isOnline,
    lastActiveAt: m.volunteer.lastActiveAt,
    role: m.role,
  }));
}

export async function markRead(teamId, userId, lastMessageId) {
  await verifyTeamMember(teamId, userId);

  // Add userId to readBy array for all unread messages up to lastMessageId
  const lastMessage = await prisma.chatMessage.findUnique({ where: { id: lastMessageId } });
  if (!lastMessage) return;

  await prisma.$executeRawUnsafe(`
    UPDATE chat_messages
    SET read_by = array_append(read_by, $1)
    WHERE team_id = $2
      AND created_at <= $3
      AND NOT ($1 = ANY(read_by))
  `, userId, teamId, lastMessage.createdAt);

  return { message: 'Messages marked as read' };
}

export default { getMessages, sendMessage, uploadFile, editMessage, deleteMessage, getOnlineMembers, markRead };
