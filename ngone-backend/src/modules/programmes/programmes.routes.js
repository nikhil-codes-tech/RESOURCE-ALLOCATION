import { Router } from 'express';
import * as programmesController from './programmes.controller.js';
import { protect } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleGuard.js';
import { validate } from '../../middleware/validate.js';
import { createProgrammeSchema, updateProgrammeSchema } from './programmes.schema.js';

const router = Router();

router.get('/', programmesController.list);
router.get('/:id', programmesController.get);
router.post('/', protect, requireRole('NGO_COORDINATOR'), validate(createProgrammeSchema), programmesController.create);
router.put('/:id', protect, requireRole('NGO_COORDINATOR'), validate(updateProgrammeSchema), programmesController.update);
router.delete('/:id', protect, requireRole('NGO_COORDINATOR'), programmesController.remove);

export default router;
