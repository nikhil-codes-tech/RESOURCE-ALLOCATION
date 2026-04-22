import prisma from '../../config/database.js';
import { pushNotification } from '../../socket/notification.socket.js';
import logger from '../../utils/logger.js';

/**
 * Process volunteer matching jobs
 */
export default function processMatchJobs(matchQueue, io) {
  matchQueue.process(async (job) => {
    const { crisisId } = job.data;
    logger.info(`Processing match job for crisis: ${crisisId}`);

    const crisis = await prisma.crisis.findUnique({ where: { id: crisisId } });
    if (!crisis || crisis.isDeleted) return;

    // Find nearby, available, skilled volunteers
    const volunteers = await prisma.$queryRawUnsafe(`
      SELECT
        v.id, v.user_id, v.skills, v.points, v.level,
        u.name, u.email,
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
        )) < $3
      ORDER BY distance_km ASC
      LIMIT $4
    `, crisis.latitude, crisis.longitude, 50, crisis.volunteersNeeded * 3);

    // Score and sort
    const skillsRequired = crisis.skillsRequired || [];
    const scored = volunteers.map((v) => {
      const vSkills = v.skills || [];
      const skillMatch = skillsRequired.length > 0
        ? vSkills.filter((s) => skillsRequired.includes(s)).length
        : 1;

      return {
        ...v,
        score:
          (1 / (parseFloat(v.distance_km) + 0.1)) * 0.4 +
          (v.points / 5000) * 0.3 +
          (skillsRequired.length > 0 ? (skillMatch / skillsRequired.length) * 0.3 : 0.15),
      };
    }).sort((a, b) => b.score - a.score);

    // Take top N
    const targets = scored.slice(0, crisis.volunteersNeeded * 2);

    // Notify each matched volunteer
    for (const vol of targets) {
      try {
        await pushNotification(io, vol.user_id, {
          type: 'crisis_alert',
          title: `🆘 Volunteers needed: ${crisis.title}`,
          body: `${crisis.type} in ${crisis.location}. ${parseFloat(vol.distance_km)} km away. Urgency: ${crisis.urgency}`,
          data: { crisisId: crisis.id, distance: parseFloat(vol.distance_km) },
        });

        io.to(`user:${vol.user_id}`).emit('volunteer:matched', {
          crisisId: crisis.id,
          crisisTitle: crisis.title,
          distance: parseFloat(vol.distance_km),
          urgency: crisis.urgency,
        });
      } catch (e) {
        logger.error(`Failed to notify volunteer ${vol.id}: ${e.message}`);
      }
    }

    logger.info(`Matched ${targets.length} volunteers for crisis ${crisisId}`);
    return { matched: targets.length };
  });

  logger.info('✅ Match processor registered');
}
