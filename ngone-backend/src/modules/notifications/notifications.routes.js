import { Router } from 'express';
import * as notificationsController from './notifications.controller.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { markReadSchema } from './notifications.schema.js';

const router = Router();

router.get('/', protect, notificationsController.list);
router.get('/unread-count', protect, notificationsController.getUnreadCount);
router.post('/mark-read', protect, validate(markReadSchema), notificationsController.markRead);
router.delete('/:id', protect, notificationsController.remove);

export default router;
