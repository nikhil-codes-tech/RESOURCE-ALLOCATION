import { z } from 'zod';

export const markReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1).optional(),
});

export default { markReadSchema };
