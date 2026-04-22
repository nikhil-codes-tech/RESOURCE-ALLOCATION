import { Router } from 'express';
import * as volunteersController from './volunteers.controller.js';
import { protect } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleGuard.js';
import { validate } from '../../middleware/validate.js';
import {
  nearbyQuerySchema, updateSkillsSchema, updateAvailabilitySchema,
  updateLocationSchema, updateOnlineSchema, checkInSchema, checkOutSchema,
} from './volunteers.schema.js';

const router = Router();

router.get('/', protect, requireRole('ADMIN'), volunteersController.listVolunteers);
router.get('/nearby', validate(nearbyQuerySchema, 'query'), volunteersController.getNearby);
router.get('/leaderboard', volunteersController.getLeaderboard);
router.get('/me', protect, volunteersController.getMyProfile);
router.get('/me/badges', protect, volunteersController.getBadges);
router.get('/me/tasks', protect, volunteersController.getMyTasks);
router.get('/me/stats', protect, volunteersController.getStats);
router.get('/:id', volunteersController.getVolunteer);

router.put('/me/skills', protect, validate(updateSkillsSchema), volunteersController.updateSkills);
router.put('/me/availability', protect, validate(updateAvailabilitySchema), volunteersController.updateAvailability);
router.put('/me/location', protect, validate(updateLocationSchema), volunteersController.updateLocation);
router.put('/me/online', protect, validate(updateOnlineSchema), volunteersController.updateOnline);

router.post('/check-in', protect, validate(checkInSchema), volunteersController.checkIn);
router.post('/check-out', protect, validate(checkOutSchema), volunteersController.checkOut);

export default router;
