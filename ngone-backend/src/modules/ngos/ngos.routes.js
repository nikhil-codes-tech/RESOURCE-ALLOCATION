import { Router } from 'express';
import * as ngosController from './ngos.controller.js';
import { protect } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleGuard.js';
import { validate } from '../../middleware/validate.js';
import { uploadSingleImage, processUpload } from '../../middleware/upload.js';
import { createNGOSchema, updateNGOSchema, verifyDarpanSchema } from './ngos.schema.js';

const router = Router();

router.get('/', ngosController.listNGOs);
router.get('/leaderboard', ngosController.getLeaderboard);
router.get('/me', protect, requireRole('NGO_COORDINATOR'), ngosController.getMyNGO);
router.get('/:id', ngosController.getNGO);
router.get('/:id/impact', ngosController.getImpact);
router.get('/:id/crises', ngosController.getNGOCrises);
router.get('/:id/programmes', ngosController.getNGOProgrammes);

router.post('/', protect, requireRole('NGO_COORDINATOR'), validate(createNGOSchema), ngosController.createNGO);
router.put('/me', protect, requireRole('NGO_COORDINATOR'), validate(updateNGOSchema), ngosController.updateNGO);
router.post('/me/logo', protect, requireRole('NGO_COORDINATOR'), uploadSingleImage('logo'), processUpload('logos'), ngosController.uploadLogo);
router.post('/verify-darpan', protect, requireRole('NGO_COORDINATOR'), validate(verifyDarpanSchema), ngosController.verifyDarpan);
router.put('/me/impact-score', protect, requireRole('NGO_COORDINATOR'), ngosController.recalculateImpact);

export default router;
