import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import volunteersRoutes from '../modules/volunteers/volunteers.routes.js';
import ngosRoutes from '../modules/ngos/ngos.routes.js';
import crisesRoutes from '../modules/crises/crises.routes.js';
import teamsRoutes from '../modules/teams/teams.routes.js';
import chatRoutes from '../modules/chat/chat.routes.js';
import donationsRoutes from '../modules/donations/donations.routes.js';
import resourcesRoutes from '../modules/resources/resources.routes.js';
import programmesRoutes from '../modules/programmes/programmes.routes.js';
import notificationsRoutes from '../modules/notifications/notifications.routes.js';

const router = Router();

// ── Health check ────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  const uptime = process.uptime();
  let dbStatus = 'disconnected';
  let redisStatus = 'disconnected';

  try {
    const { default: prisma } = await import('../config/database.js');
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'error';
  }

  try {
    const { default: redis } = await import('../config/redis.js');
    const pong = await redis.ping();
    redisStatus = pong === 'PONG' ? 'connected' : 'error';
  } catch {
    redisStatus = 'error';
  }

  const healthy = dbStatus === 'connected' && redisStatus === 'connected';

  res.status(healthy ? 200 : 503).json({
    success: true,
    message: 'NGone API Health Check',
    data: {
      status: healthy ? 'healthy' : 'degraded',
      db: dbStatus,
      redis: redisStatus,
      uptime: `${Math.floor(uptime)}s`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  });
});

// ── Module routes ───────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/volunteers', volunteersRoutes);
router.use('/ngos', ngosRoutes);
router.use('/crises', crisesRoutes);
router.use('/teams', teamsRoutes);
router.use('/chat', chatRoutes);
router.use('/donations', donationsRoutes);
router.use('/resources', resourcesRoutes);
router.use('/programmes', programmesRoutes);
router.use('/notifications', notificationsRoutes);

export default router;
