import { Router } from 'express';
import * as crisesController from './crises.controller.js';
import { protect } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleGuard.js';
import { validate } from '../../middleware/validate.js';
import { uploadMultipleImages, processUpload } from '../../middleware/upload.js';
import { createCrisisSchema, updateCrisisSchema, updateStatusSchema, nearbyQuerySchema } from './crises.schema.js';

const router = Router();

router.get('/', crisesController.listCrises);
router.get('/map', crisesController.getMapPins);
router.get('/nearby', validate(nearbyQuerySchema, 'query'), crisesController.getNearby);
router.get('/:id', crisesController.getCrisis);
router.get('/:id/volunteers', crisesController.getVolunteers);

router.post('/', protect, requireRole('NGO_COORDINATOR'), validate(createCrisisSchema), crisesController.createCrisis);
router.put('/:id', protect, requireRole('NGO_COORDINATOR'), validate(updateCrisisSchema), crisesController.updateCrisis);
router.put('/:id/status', protect, requireRole('NGO_COORDINATOR'), validate(updateStatusSchema), crisesController.updateStatus);
router.post('/:id/images', protect, requireRole('NGO_COORDINATOR'), uploadMultipleImages('images', 5), processUpload('crises'), crisesController.uploadImages);
router.post('/:id/dispatch', protect, requireRole('NGO_COORDINATOR'), crisesController.dispatch);
router.delete('/:id', protect, requireRole('ADMIN'), crisesController.deleteCrisis);

export default router;
