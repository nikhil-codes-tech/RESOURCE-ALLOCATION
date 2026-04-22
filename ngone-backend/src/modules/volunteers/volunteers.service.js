import prisma from '../../config/database.js';
import { AppError, ErrorCodes } from '../../utils/apiResponse.js';
import { getOffsetPagination, buildPaginationMeta } from '../../utils/paginate.js';
import logger from '../../utils/logger.js';

const POINTS = {
  TASK_CHECKIN: 50,
  TASK_COMPLETE: 200,
  TEAM_LEAD: 100,
  CRISIS_RESPONSE: 300,
  REFERRAL: 75,
  PROFILE_COMPLETE: 25,
  STREAK_BONUS: 50,
};

const LEVEL_THRESHOLDS = [
  { level: 'LEGEND', minPoints: 3000 },
  { level: 'HERO', minPoints: 1500 },
  { level: 'RESPONDER', minPoints: 500 },
  { level: 'ROOKIE', minPoints: 0 },
];

function calculateLevel(points) {
  for (const t of LEVEL_THRESHOLDS) {
    if (points >= t.minPoints) return t.level;
  }
  return 'ROOKIE';
}

async function checkAndAwardBadges(volunteerId, volunteer) {
  const badges = [];
  const existing = await prisma.volunteerBadge.findMany({
    where: { volunteerId },
    select: { name: true },
  });
  const has = (name) => existing.some((b) => b.name === name);

  if (volunteer.tasksCompleted >= 1 && !has('First Task'))
    badges.push({ name: 'First Task', description: 'Completed your first task', icon: '🎯' });
  if (volunteer.tasksCompleted >= 10 && !has('Task Master'))
    badges.push({ name: 'Task Master', description: 'Completed 10 tasks', icon: '🏆' });
  if (volunteer.tasksCompleted >= 50 && !has('Veteran'))
    badges.push({ name: 'Veteran', description: 'Completed 50 tasks', icon: '🎖️' });
  if (volunteer.points >= 3000 && !has('Legend'))
    badges.push({ name: 'Legend', description: 'Achieved Legend status', icon: '👑' });
  if (volunteer.streak >= 7 && !has('Streak Master'))
    badges.push({ name: 'Streak Master', description: '7-day activity streak', icon: '🔥' });
  if (volunteer.hoursLogged >= 100 && !has('Century'))
    badges.push({ name: 'Century', description: '100+ hours logged', icon: '💯' });

  if (badges.length > 0) {
    await prisma.volunteerBadge.createMany({
      data: badges.map((b) => ({ volunteerId, ...b })),
      skipDuplicates: true,
    });
  }
  return badges;
}

export async function listVolunteers(query) {
  const { skip, take, page, limit } = getOffsetPagination(query);
  const where = {};

  if (query.skills) {
    where.skills = { hasSome: query.skills.split(',') };
  }
  if (query.level) where.level = query.level;
  if (query.isOnline !== undefined) where.isOnline = query.isOnline === 'true';

  const [volunteers, total] = await Promise.all([
    prisma.volunteer.findMany({
      where,
      skip,
      take,
      orderBy: { points: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, city: true, state: true } },
        badges: true,
      },
    }),
    prisma.volunteer.count({ where }),
  ]);

  return { volunteers, meta: buildPaginationMeta(total, page, limit) };
}

export async function findNearbyVolunteers({ lat, lng, radius, skills }) {
  const skillFilter = skills ? skills.split(',') : null;

  const volunteers = await prisma.$queryRawUnsafe(`
    SELECT
      v.id, v.skills, v.points, v.level, v.is_online,
      v.is_available, v.hours_logged, v.tasks_completed,
      u.id as user_id, u.name, u.city, u.avatar_url, u.state,
      ROUND(
        (6371 * acos(
          LEAST(1.0, cos(radians($1)) * cos(radians(v.latitude))
          * cos(radians(v.longitude) - radians($2))
          + sin(radians($1)) * sin(radians(v.latitude)))
        ))::numeric, 2
      ) AS distance_km
    FROM volunteers v
    JOIN users u ON v.user_id = u.id
    WHERE
      v.latitude IS NOT NULL
      AND v.longitude IS NOT NULL
      AND u.is_active = true
      AND v.is_available = true
      AND (
        $3::text[] IS NULL
        OR v.skills && $3::text[]
      )
      AND (6371 * acos(
        LEAST(1.0, cos(radians($1)) * cos(radians(v.latitude))
        * cos(radians(v.longitude) - radians($2))
        + sin(radians($1)) * sin(radians(v.latitude)))
      )) < $4
    ORDER BY distance_km ASC
    LIMIT 20
  `, lat, lng, skillFilter, radius);

  return volunteers;
}

export async function getLeaderboard(query) {
  const { skip, take, page, limit } = getOffsetPagination({ ...query, limit: query.limit || 50 });

  const [volunteers, total] = await Promise.all([
    prisma.volunteer.findMany({
      skip,
      take,
      orderBy: { points: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, city: true, state: true } },
        badges: { select: { name: true, icon: true } },
      },
    }),
    prisma.volunteer.count(),
  ]);

  const ranked = volunteers.map((v, i) => ({ rank: skip + i + 1, ...v }));
  return { volunteers: ranked, meta: buildPaginationMeta(total, page, limit) };
}

export async function getMyProfile(userId) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true, city: true, state: true, bio: true } },
      badges: true,
    },
  });
  if (!volunteer) throw new AppError(404, 'Volunteer profile not found', ErrorCodes.NOT_FOUND);
  return volunteer;
}

export async function getVolunteerById(id) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, city: true, state: true, bio: true } },
      badges: { select: { name: true, description: true, icon: true, awardedAt: true } },
    },
  });
  if (!volunteer) throw new AppError(404, 'Volunteer not found', ErrorCodes.NOT_FOUND);
  return volunteer;
}

export async function updateSkills(userId, skills) {
  const volunteer = await prisma.volunteer.update({
    where: { userId },
    data: { skills },
  });
  return volunteer;
}

export async function updateAvailability(userId, availability) {
  return prisma.volunteer.update({ where: { userId }, data: { availability } });
}

export async function updateLocation(userId, latitude, longitude) {
  return prisma.volunteer.update({
    where: { userId },
    data: { latitude, longitude, lastActiveAt: new Date() },
  });
}

export async function updateOnlineStatus(userId, isOnline) {
  return prisma.volunteer.update({
    where: { userId },
    data: { isOnline, lastActiveAt: new Date() },
  });
}

export async function getBadges(userId) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
  if (!volunteer) throw new AppError(404, 'Volunteer not found');
  return prisma.volunteerBadge.findMany({
    where: { volunteerId: volunteer.id },
    orderBy: { awardedAt: 'desc' },
  });
}

export async function getMyTasks(userId) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
  if (!volunteer) throw new AppError(404, 'Volunteer not found');

  const members = await prisma.teamMember.findMany({
    where: { volunteerId: volunteer.id },
    include: {
      team: {
        include: {
          task: { include: { crisis: { select: { id: true, title: true, type: true, urgency: true, location: true } } } },
        },
      },
    },
  });

  return members.map((m) => ({
    teamId: m.teamId,
    teamName: m.team.name,
    role: m.role,
    task: m.team.task,
  }));
}

export async function checkIn(userId, taskId, latitude, longitude) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
  if (!volunteer) throw new AppError(404, 'Volunteer not found');

  const existingCheckIn = await prisma.taskCheckIn.findFirst({
    where: { volunteerId: volunteer.id, taskId, checkOutAt: null },
  });
  if (existingCheckIn) throw new AppError(400, 'Already checked in to this task');

  const checkIn = await prisma.taskCheckIn.create({
    data: {
      taskId,
      volunteerId: volunteer.id,
      pointsEarned: POINTS.TASK_CHECKIN,
      latitude,
      longitude,
    },
  });

  const updated = await prisma.volunteer.update({
    where: { id: volunteer.id },
    data: {
      points: { increment: POINTS.TASK_CHECKIN },
      lastActiveAt: new Date(),
      streak: { increment: 1 },
    },
  });

  const newLevel = calculateLevel(updated.points);
  if (newLevel !== updated.level) {
    await prisma.volunteer.update({ where: { id: volunteer.id }, data: { level: newLevel } });
  }

  const newBadges = await checkAndAwardBadges(volunteer.id, updated);

  logger.info(`Volunteer ${volunteer.id} checked in to task ${taskId}, earned ${POINTS.TASK_CHECKIN} pts`);

  return {
    checkIn,
    pointsEarned: POINTS.TASK_CHECKIN,
    totalPoints: updated.points,
    level: newLevel,
    newBadges,
  };
}

export async function checkOut(userId, taskId, notes) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
  if (!volunteer) throw new AppError(404, 'Volunteer not found');

  const checkInRecord = await prisma.taskCheckIn.findFirst({
    where: { volunteerId: volunteer.id, taskId, checkOutAt: null },
  });
  if (!checkInRecord) throw new AppError(400, 'No active check-in found');

  const now = new Date();
  const hoursLogged = (now - checkInRecord.checkInAt) / (1000 * 60 * 60);
  const pointsForCompletion = POINTS.TASK_COMPLETE;

  const updatedCheckIn = await prisma.taskCheckIn.update({
    where: { id: checkInRecord.id },
    data: {
      checkOutAt: now,
      hoursLogged: Math.round(hoursLogged * 100) / 100,
      notes,
      pointsEarned: checkInRecord.pointsEarned + pointsForCompletion,
    },
  });

  const updated = await prisma.volunteer.update({
    where: { id: volunteer.id },
    data: {
      points: { increment: pointsForCompletion },
      hoursLogged: { increment: Math.round(hoursLogged * 100) / 100 },
      tasksCompleted: { increment: 1 },
      lastActiveAt: now,
    },
  });

  const newLevel = calculateLevel(updated.points);
  if (newLevel !== updated.level) {
    await prisma.volunteer.update({ where: { id: volunteer.id }, data: { level: newLevel } });
  }

  const newBadges = await checkAndAwardBadges(volunteer.id, updated);

  logger.info(`Volunteer ${volunteer.id} checked out, logged ${hoursLogged.toFixed(1)}h`);

  return {
    checkIn: updatedCheckIn,
    pointsEarned: pointsForCompletion,
    totalPoints: updated.points,
    hoursLogged: Math.round(hoursLogged * 100) / 100,
    level: newLevel,
    newBadges,
  };
}

export async function getStats(userId) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { userId },
    include: { badges: true },
  });
  if (!volunteer) throw new AppError(404, 'Volunteer not found');

  const rank = await prisma.volunteer.count({ where: { points: { gt: volunteer.points } } }) + 1;

  return {
    points: volunteer.points,
    level: volunteer.level,
    tasksCompleted: volunteer.tasksCompleted,
    hoursLogged: volunteer.hoursLogged,
    streak: volunteer.streak,
    badges: volunteer.badges.length,
    rank,
  };
}

export default {
  listVolunteers, findNearbyVolunteers, getLeaderboard, getMyProfile,
  getVolunteerById, updateSkills, updateAvailability, updateLocation,
  updateOnlineStatus, getBadges, getMyTasks, checkIn, checkOut, getStats,
};
