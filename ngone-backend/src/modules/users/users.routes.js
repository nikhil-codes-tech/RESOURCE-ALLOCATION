import { Router } from 'express';
import * as usersController from './users.controller.js';
import { protect } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleGuard.js';
import { validate } from '../../middleware/validate.js';
import { uploadSingleImage, processUpload } from '../../middleware/upload.js';
import { updateProfileSchema, userIdParamSchema } from './users.schema.js';

const router = Router();

router.get('/', protect, requireRole('ADMIN'), usersController.listUsers);
router.get('/:id', protect, validate(userIdParamSchema, 'params'), usersController.getUser);
router.put('/me', protect, validate(updateProfileSchema), usersController.updateProfile);
router.post('/me/avatar', protect, uploadSingleImage('avatar'), processUpload('avatars'), usersController.updateAvatar);
router.delete('/me', protect, usersController.deactivateAccount);

export default router;
