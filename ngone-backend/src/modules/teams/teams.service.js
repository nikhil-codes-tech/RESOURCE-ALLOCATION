import prisma from '../../config/database.js';
import { AppError, ErrorCodes } from '../../utils/apiResponse.js';
import { getOffsetPagination, buildPaginationMeta } from '../../utils/paginate.js';
import { emailQueue, smsQueue } from '../../config/queue.js';
import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.js';

export async function listOpenTeams(query) {
  const { skip, take, page, limit } = getOffsetPagination(query);
  const where = { isOpen: true };

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: {
        task: { include: { crisis: { select: { id: true, title: true, type: true, urgency: true, location: true } } } },
        members: { include: { volunteer: { include: { user: { select: { name: true, avatarUrl: true } } } } } },
        _count: { select: { members: true } },
      },
    }),
    prisma.team.count({ where }),
  ]);

  return { teams, meta: buildPaginationMeta(total, page, limit) };
}

export async function getMyTeams(userId) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
  if (!volunteer) throw new AppError(404, 'Volunteer not found');

  const memberships = await prisma.teamMember.findMany({
    where: { volunteerId: volunteer.id },
    include: {
      team: {
        include: {
          task: { include: { crisis: { select: { id: true, title: true, type: true, urgency: true } } } },
          _count: { select: { members: true } },
        },
      },
    },
  });

  return memberships.map((m) => ({ ...m.team, myRole: m.role }));
}

export async function getTeamById(id) {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      task: { include: { crisis: true } },
      members: {
        include: {
          volunteer: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true, city: true } },
            },
          },
        },
      },
      invites: { where: { status: 'PENDING' } },
    },
  });
  if (!team) throw new AppError(404, 'Team not found', ErrorCodes.NOT_FOUND);
  return team;
}

export async function createTeam(userId, data) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
  if (!volunteer) throw new AppError(404, 'Volunteer profile not found');

  const task = await prisma.task.findUnique({ where: { id: data.taskId } });
  if (!task) throw new AppError(404, 'Task not found');

  const team = await prisma.$transaction(async (tx) => {
    const newTeam = await tx.team.create({
      data: {
        taskId: data.taskId,
        name: data.name || `Team ${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        leaderId: volunteer.id,
        maxSize: data.maxSize,
        currentSize: 1,
      },
    });

    await tx.teamMember.create({
      data: {
        teamId: newTeam.id,
        volunteerId: volunteer.id,
        role: 'LEADER',
      },
    });

    return newTeam;
  });

  logger.info(`Team created: ${team.id} by volunteer ${volunteer.id}`);
  return team;
}

export async function joinTeam(teamId, userId) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
  if (!volunteer) throw new AppError(404, 'Volunteer not found');

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError(404, 'Team not found');
  if (!team.isOpen) throw new AppError(400, 'Team is closed');
  if (team.currentSize >= team.maxSize) throw new AppError(400, 'Team is full');

  const existing = await prisma.teamMember.findUnique({
    where: { teamId_volunteerId: { teamId, volunteerId: volunteer.id } },
  });
  if (existing) throw new AppError(400, 'Already a member of this team');

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.create({
      data: { teamId, volunteerId: volunteer.id, role: 'MEMBER' },
    });
    await tx.team.update({
      where: { id: teamId },
      data: {
        currentSize: { increment: 1 },
        isOpen: team.currentSize + 1 < team.maxSize,
      },
    });
  });

  try {
    const io = getIO();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatarUrl: true } });
    io.to(`team:${teamId}`).emit('team:member_join', { teamId, volunteer: { name: user.name, avatarUrl: user.avatarUrl } });
  } catch (e) { /* ignore */ }

  return { message: 'Joined team successfully' };
}

export async function leaveTeam(teamId, userId) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
  if (!volunteer) throw new AppError(404, 'Volunteer not found');

  const member = await prisma.teamMember.findUnique({
    where: { teamId_volunteerId: { teamId, volunteerId: volunteer.id } },
  });
  if (!member) throw new AppError(400, 'Not a member of this team');

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (team.leaderId === volunteer.id) throw new AppError(400, 'Leader cannot leave. Transfer leadership first.');

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.delete({
      where: { teamId_volunteerId: { teamId, volunteerId: volunteer.id } },
    });
    await tx.team.update({
      where: { id: teamId },
      data: { currentSize: { decrement: 1 }, isOpen: true },
    });
  });

  try {
    const io = getIO();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    io.to(`team:${teamId}`).emit('team:member_leave', { teamId, userId, name: user.name });
  } catch (e) { /* ignore */ }

  return { message: 'Left team successfully' };
}

export async function inviteVolunteer(teamId, senderId, volunteerId, message) {
  const senderVol = await prisma.volunteer.findUnique({ where: { userId: senderId } });
  if (!senderVol) throw new AppError(404, 'Sender volunteer not found');

  // Check sender is team member
  const senderMember = await prisma.teamMember.findUnique({
    where: { teamId_volunteerId: { teamId, volunteerId: senderVol.id } },
  });
  if (!senderMember) throw new AppError(403, 'You must be a team member to invite');

  const team = await prisma.team.findUnique({ where: { id: teamId }, include: { task: true } });
  if (!team) throw new AppError(404, 'Team not found');
  if (team.currentSize >= team.maxSize) throw new AppError(400, 'Team is full');

  // Check target not already member
  const existingMember = await prisma.teamMember.findUnique({
    where: { teamId_volunteerId: { teamId, volunteerId } },
  });
  if (existingMember) throw new AppError(400, 'Volunteer is already in this team');

  // Check no pending invite
  const existingInvite = await prisma.teamInvite.findFirst({
    where: { teamId, volunteerId, status: 'PENDING' },
  });
  if (existingInvite) throw new AppError(400, 'Invite already pending');

  const invite = await prisma.teamInvite.create({
    data: {
      teamId,
      volunteerId,
      senderId: senderVol.id,
      message,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });

  // Socket notification
  const targetVol = await prisma.volunteer.findUnique({
    where: { id: volunteerId },
    include: { user: { select: { id: true, name: true, phone: true, email: true } } },
  });
  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true } });

  try {
    const io = getIO();
    io.to(`user:${targetVol.user.id}`).emit('team:invite', {
      inviteId: invite.id, teamId, taskName: team.task.title,
      senderName: sender.name, expiresAt: invite.expiresAt,
    });
  } catch (e) { /* ignore */ }

  // Queue SMS
  if (targetVol.user.phone) {
    await smsQueue.add('team_invite_sms', {
      phone: targetVol.user.phone,
      message: `You've been invited to join ${team.task.title} team on NGone! Accept: ${process.env.CLIENT_URL}/teams/invites -NGONE`,
    });
  }

  // Queue email
  if (targetVol.user.email) {
    await emailQueue.add('team_invite', {
      to: targetVol.user.email,
      data: {
        inviteeName: targetVol.user.name,
        senderName: sender.name,
        taskName: team.task.title,
        acceptUrl: `${process.env.CLIENT_URL}/teams/invites`,
      },
    });
  }

  logger.info(`Team invite sent: ${invite.id} to volunteer ${volunteerId}`);
  return invite;
}

export async function respondToInvite(inviteId, userId, action) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
  if (!volunteer) throw new AppError(404, 'Volunteer not found');

  const invite = await prisma.teamInvite.findUnique({
    where: { id: inviteId },
    include: { team: { include: { task: true } } },
  });
  if (!invite) throw new AppError(404, 'Invite not found');
  if (invite.volunteerId !== volunteer.id) throw new AppError(403, 'This invite is not for you');
  if (invite.status !== 'PENDING') throw new AppError(400, 'Invite already responded to');
  if (invite.expiresAt < new Date()) throw new AppError(400, 'Invite expired');

  if (action === 'accept') {
    if (invite.team.currentSize >= invite.team.maxSize) throw new AppError(400, 'Team is now full');

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.create({
        data: { teamId: invite.teamId, volunteerId: volunteer.id, role: 'MEMBER' },
      });
      await tx.team.update({
        where: { id: invite.teamId },
        data: {
          currentSize: { increment: 1 },
          isOpen: invite.team.currentSize + 1 < invite.team.maxSize,
        },
      });
      await tx.teamInvite.update({
        where: { id: inviteId },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });
    });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatarUrl: true } });

    try {
      const io = getIO();
      io.to(`team:${invite.teamId}`).emit('team:member_join', {
        teamId: invite.teamId, volunteer: { name: user.name, avatarUrl: user.avatarUrl },
      });

      // Check if team is now complete
      const updatedTeam = await prisma.team.findUnique({ where: { id: invite.teamId } });
      if (updatedTeam.currentSize >= updatedTeam.maxSize) {
        io.to(`team:${invite.teamId}`).emit('team:complete', {
          teamId: invite.teamId, taskName: invite.team.task.title, memberCount: updatedTeam.maxSize,
        });

        // SMS to all members
        const members = await prisma.teamMember.findMany({
          where: { teamId: invite.teamId },
          include: { volunteer: { include: { user: { select: { phone: true } } } } },
        });
        for (const m of members) {
          if (m.volunteer.user.phone) {
            await smsQueue.add('team_complete', {
              phone: m.volunteer.user.phone,
              message: `Your NGone team is complete! ${updatedTeam.maxSize}/${updatedTeam.maxSize} confirmed for ${invite.team.task.title}. -NGONE`,
            });
          }
        }
      }
    } catch (e) { /* ignore */ }
  } else {
    await prisma.teamInvite.update({
      where: { id: inviteId },
      data: { status: 'DECLINED', respondedAt: new Date() },
    });

    // Notify team leader
    try {
      const io = getIO();
      const leaderVol = await prisma.volunteer.findUnique({ where: { id: invite.team.leaderId } });
      if (leaderVol) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        io.to(`user:${leaderVol.userId}`).emit('invite:responded', {
          inviteId, action: 'decline', volunteer: { name: user.name },
        });
      }
    } catch (e) { /* ignore */ }
  }

  return { message: `Invite ${action}ed` };
}

export async function getPendingInvites(userId) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
  if (!volunteer) throw new AppError(404, 'Volunteer not found');

  return prisma.teamInvite.findMany({
    where: { volunteerId: volunteer.id, status: 'PENDING', expiresAt: { gt: new Date() } },
    include: {
      team: { include: { task: { include: { crisis: { select: { title: true, type: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTeamMembers(teamId) {
  return prisma.teamMember.findMany({
    where: { teamId },
    include: {
      volunteer: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, city: true } },
        },
      },
    },
  });
}

export async function kickMember(teamId, volunteerId, userId) {
  const senderVol = await prisma.volunteer.findUnique({ where: { userId } });
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError(404, 'Team not found');
  if (team.leaderId !== senderVol?.id) throw new AppError(403, 'Only team leader can kick members');
  if (volunteerId === senderVol.id) throw new AppError(400, 'Cannot kick yourself');

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.delete({
      where: { teamId_volunteerId: { teamId, volunteerId } },
    });
    await tx.team.update({
      where: { id: teamId },
      data: { currentSize: { decrement: 1 }, isOpen: true },
    });
  });

  return { message: 'Member removed' };
}

export async function transferLeadership(teamId, newLeaderId, userId) {
  const senderVol = await prisma.volunteer.findUnique({ where: { userId } });
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError(404, 'Team not found');
  if (team.leaderId !== senderVol?.id) throw new AppError(403, 'Only leader can transfer');

  const newLeaderMember = await prisma.teamMember.findUnique({
    where: { teamId_volunteerId: { teamId, volunteerId: newLeaderId } },
  });
  if (!newLeaderMember) throw new AppError(400, 'New leader must be a team member');

  await prisma.$transaction(async (tx) => {
    await tx.team.update({ where: { id: teamId }, data: { leaderId: newLeaderId } });
    await tx.teamMember.update({
      where: { teamId_volunteerId: { teamId, volunteerId: newLeaderId } },
      data: { role: 'LEADER' },
    });
    await tx.teamMember.update({
      where: { teamId_volunteerId: { teamId, volunteerId: senderVol.id } },
      data: { role: 'MEMBER' },
    });
  });

  return { message: 'Leadership transferred' };
}

export default {
  listOpenTeams, getMyTeams, getTeamById, createTeam, joinTeam, leaveTeam,
  inviteVolunteer, respondToInvite, getPendingInvites, getTeamMembers,
  kickMember, transferLeadership,
};
