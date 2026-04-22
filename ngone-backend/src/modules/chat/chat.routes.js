import { Router } from 'express';
import * as chatController from './chat.controller.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { uploadSingleFile, processUpload } from '../../middleware/upload.js';
import { sendMessageSchema, editMessageSchema, readSchema } from './chat.schema.js';

const router = Router();

router.get('/:teamId/messages', protect, chatController.getMessages);
router.post('/:teamId/messages', protect, validate(sendMessageSchema), chatController.sendMessage);
router.post('/:teamId/upload', protect, uploadSingleFile('file'), processUpload('chat'), chatController.uploadFile);
router.get('/:teamId/members', protect, chatController.getMembers);
router.post('/:teamId/read', protect, validate(readSchema), chatController.markRead);

router.put('/messages/:id', protect, validate(editMessageSchema), chatController.editMessage);
router.delete('/messages/:id', protect, chatController.deleteMessage);

export default router;
