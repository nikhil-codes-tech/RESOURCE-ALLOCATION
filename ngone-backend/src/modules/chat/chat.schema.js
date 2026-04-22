import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['text', 'image', 'file', 'system']).default('text'),
});

export const editMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const readSchema = z.object({
  lastMessageId: z.string().min(1),
});

export default { sendMessageSchema, editMessageSchema, readSchema };
