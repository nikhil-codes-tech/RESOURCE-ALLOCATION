import { z } from 'zod';

export const createTeamSchema = z.object({
  taskId: z.string().min(1),
  name: z.string().min(2).max(50).optional(),
  maxSize: z.coerce.number().min(2).max(20).default(5),
});

export const inviteSchema = z.object({
  volunteerId: z.string().min(1),
  message: z.string().max(200).optional(),
});

export const respondInviteSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

export const transferLeaderSchema = z.object({
  volunteerId: z.string().min(1),
});

export default { createTeamSchema, inviteSchema, respondInviteSchema, transferLeaderSchema };
