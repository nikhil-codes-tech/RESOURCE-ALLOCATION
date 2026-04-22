import { Router } from 'express';
import * as resourcesController from './resources.controller.js';
import { protect } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleGuard.js';
import { validate } from '../../middleware/validate.js';
import { createResourceSchema, updateResourceSchema, allocateSchema } from './resources.schema.js';

const router = Router();

router.get('/', resourcesController.listResources);
router.get('/stats/:ngoId', resourcesController.getStats);
router.get('/:id', resourcesController.getResource);

router.post('/', protect, requireRole('NGO_COORDINATOR'), validate(createResourceSchema), resourcesController.createResource);
router.put('/:id', protect, requireRole('NGO_COORDINATOR'), validate(updateResourceSchema), resourcesController.updateResource);
router.post('/:id/allocate', protect, requireRole('NGO_COORDINATOR'), validate(allocateSchema), resourcesController.allocateResource);
router.delete('/:id', protect, requireRole('NGO_COORDINATOR'), resourcesController.deleteResource);

export default router;
