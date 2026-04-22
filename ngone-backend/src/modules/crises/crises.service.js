import prisma from '../../config/database.js';
import { AppError, ErrorCodes } from '../../utils/apiResponse.js';
import { getOffsetPagination, buildPaginationMeta } from '../../utils/paginate.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { notificationQueue } from '../../config/queue.js';
import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.js';

export async function listCrises(query) {
  const { skip, take, page, limit } = getOffsetPagination(query);
  const where = { isDeleted: false };

  if (query.type) where.type = query.type;
  if (query.urgency) where.urgency = query.urgency;
  if (query.state) where.state = query.state;
  if (query.status) where.status = query.status;

  const [crises, total] = await Promise.all([
    prisma.crisis.findMany({
      where, skip, take,
      orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
      include: {
        ngo: { select: { id: true, name: true, slug: true, logoUrl: true } },
        _count: { select: { tasks: true } },
      },
    }),
    prisma.crisis.count({ where }),
  ]);

  return { crises, meta: buildPaginationMeta(total, page, limit) };
}

export async function getMapPins() {
  return prisma.crisis.findMany({
    where: { isDeleted: false, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    select: {
      id: true, title: true, type: true, urgency: true,
      latitude: true, longitude: true, location: true,
      volunteersNeeded: true, volunteersAssigned: true, status: true,
    },
  });
}

export async function getNearby(lat, lng, radius) {
  const crises = await prisma.$queryRawUnsafe(`
    SELECT
      c.id, c.title, c.type, c.urgency, c.status, c.location,
      c.latitude, c.longitude, c.volunteers_needed, c.volunteers_assigned,
      n.name as ngo_name,
      ROUND(
        (6371 * acos(
          LEAST(1.0, cos(radians($1)) * cos(radians(c.latitude))
          * cos(radians(c.longitude) - radians($2))
          + sin(radians($1)) * sin(radians(c.latitude)))
        ))::numeric, 2
      ) AS distance_km
    FROM crises c
    JOIN ngos n ON c.ngo_id = n.id
    WHERE
      c.is_deleted = false
      AND c.status IN ('OPEN', 'IN_PROGRESS')
      AND (6371 * acos(
        LEAST(1.0, cos(radians($1)) * cos(radians(c.latitude))
        * cos(radians(c.longitude) - radians($2))
        + sin(radians($1)) * sin(radians(c.latitude)))
      )) < $3
    ORDER BY c.urgency DESC, distance_km ASC
    LIMIT 50
  `, lat, lng, radius);

  return crises;
}

export async function getCrisisById(id) {
  const crisis = await prisma.crisis.findUnique({
    where: { id },
    include: {
      ngo: { select: { id: true, name: true, slug: true, logoUrl: true, city: true, state: true } },
      tasks: {
        include: {
          teams: { include: { members: { include: { volunteer: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } } } } },
        },
      },
    },
  });
  if (!crisis || crisis.isDeleted) throw new AppError(404, 'Crisis not found', ErrorCodes.NOT_FOUND);
  return crisis;
}

export async function createCrisis(userId, data) {
  const ngo = await prisma.nGO.findUnique({ where: { userId } });
  if (!ngo) throw new AppError(404, 'NGO profile not found. Create an NGO first.');

  const slug = await uniqueSlug(data.title, async (s) => !!(await prisma.crisis.findUnique({ where: { slug: s } })));

  const crisis = await prisma.$transaction(async (tx) => {
    const newCrisis = await tx.crisis.create({
      data: { ...data, ngoId: ngo.id, slug },
    });

    // Auto-create a task for this crisis
    await tx.task.create({
      data: {
        crisisId: newCrisis.id,
        title: `${data.title} — Response Team`,
        description: `Primary response team for ${data.title}`,
        status: 'OPEN',
        priority: data.urgency === 'EXTREME' ? 5 : data.urgency === 'CRITICAL' ? 4 : 3,
      },
    });

    return newCrisis;
  });

  logger.info(`Crisis created: ${crisis.id} (${crisis.type}) by NGO ${ngo.id}`);
  return crisis;
}

export async function updateCrisis(id, userId, data) {
  const crisis = await prisma.crisis.findUnique({ where: { id }, include: { ngo: true } });
  if (!crisis) throw new AppError(404, 'Crisis not found');
  if (crisis.ngo.userId !== userId) throw new AppError(403, 'Not authorized to update this crisis');

  return prisma.crisis.update({ where: { id }, data });
}

export async function updateStatus(id, userId, status) {
  const crisis = await prisma.crisis.findUnique({ where: { id }, include: { ngo: true } });
  if (!crisis) throw new AppError(404, 'Crisis not found');
  if (crisis.ngo.userId !== userId) throw new AppError(403, 'Not authorized');

  const updated = await prisma.crisis.update({
    where: { id },
    data: { status, resolvedAt: status === 'COMPLETED' ? new Date() : null },
  });

  // Notify assigned volunteers
  try {
    const io = getIO();
    io.emit('crisis:updated', { crisisId: id, status, title: crisis.title });
  } catch (e) { /* socket may not be initialized */ }

  return updated;
}

export async function uploadImages(id, userId, imageUrls) {
  const crisis = await prisma.crisis.findUnique({ where: { id }, include: { ngo: true } });
  if (!crisis) throw new AppError(404, 'Crisis not found');
  if (crisis.ngo.userId !== userId) throw new AppError(403, 'Not authorized');

  return prisma.crisis.update({
    where: { id },
    data: { imageUrls: { push: imageUrls } },
  });
}

export async function dispatchVolunteers(crisisId) {
  const crisis = await prisma.crisis.findUnique({ where: { id: crisisId } });
  if (!crisis) throw new AppError(404, 'Crisis not found');

  // Step 1: Find nearby, qualified volunteers
  const volunteers = await prisma.$queryRawUnsafe(`
    SELECT
      v.id, v.user_id, v.skills, v.points, v.level, v.is_online,
      u.name,
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
      v.latitude IS NOT NULL AND v.longitude IS NOT NULL
      AND u.is_active = true AND v.is_available = true
      AND (6371 * acos(
        LEAST(1.0, cos(radians($1)) * cos(radians(v.latitude))
        * cos(radians(v.longitude) - radians($2))
        + sin(radians($1)) * sin(radians(v.latitude)))
      )) < 50
    ORDER BY distance_km ASC
    LIMIT 100
  `, crisis.latitude, crisis.longitude);

  // Step 2: Score each volunteer
  const skillsRequired = crisis.skillsRequired || [];
  const scored = volunteers.map((v) => {
    const vSkills = v.skills || [];
    const skillMatch = skillsRequired.length > 0
      ? vSkills.filter((s) => skillsRequired.includes(s)).length
      : vSkills.length;

    return {
      ...v,
      skillMatch,
      score:
        (1 / (parseFloat(v.distance_km) + 0.1)) * 0.4 +
        (v.points / 5000) * 0.3 +
        (skillsRequired.length > 0 ? (skillMatch / skillsRequired.length) * 0.3 : 0.15),
    };
  }).sort((a, b) => b.score - a.score);

  // Step 3: Take top N = volunteersNeeded * 2 buffer
  const targets = scored.slice(0, crisis.volunteersNeeded * 2);

  // Step 4: Notify via queue + socket
  for (const vol of targets) {
    await notificationQueue.add('crisis_alert', {
      volunteerId: vol.id,
      userId: vol.user_id,
      crisisId,
      crisisTitle: crisis.title,
      distance: vol.distance_km,
      urgency: crisis.urgency,
    });

    try {
      const io = getIO();
      io.to(`user:${vol.user_id}`).emit('volunteer:matched', {
        crisisId,
        crisisTitle: crisis.title,
        distance: parseFloat(vol.distance_km),
        urgency: crisis.urgency,
      });
    } catch (e) { /* socket may not be initialized */ }
  }

  logger.info(`Dispatched ${targets.length} volunteers for crisis ${crisisId}`);
  return targets;
}

export async function getCrisisVolunteers(crisisId) {
  const tasks = await prisma.task.findMany({
    where: { crisisId },
    include: {
      teams: {
        include: {
          members: {
            include: {
              volunteer: {
                include: { user: { select: { id: true, name: true, avatarUrl: true, city: true } } },
              },
            },
          },
        },
      },
    },
  });

  const volunteers = tasks.flatMap((t) => t.teams.flatMap((team) =>
    team.members.map((m) => ({
      volunteerId: m.volunteer.id,
      name: m.volunteer.user.name,
      avatarUrl: m.volunteer.user.avatarUrl,
      city: m.volunteer.user.city,
      role: m.role,
      teamName: team.name,
    }))
  ));

  return volunteers;
}

export async function softDelete(id) {
  return prisma.crisis.update({ where: { id }, data: { isDeleted: true } });
}

export default {
  listCrises, getMapPins, getNearby, getCrisisById, createCrisis,
  updateCrisis, updateStatus, uploadImages, dispatchVolunteers,
  getCrisisVolunteers, softDelete,
};
