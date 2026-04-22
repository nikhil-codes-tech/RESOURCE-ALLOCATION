import { z } from 'zod';

export const createResourceSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.enum(['food', 'medical', 'shelter', 'water', 'clothing', 'equipment']),
  quantity: z.coerce.number().min(0),
  unit: z.string().default('units'),
  location: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  description: z.string().max(500).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

export const allocateSchema = z.object({
  quantity: z.coerce.number().min(1),
});

export default { createResourceSchema, updateResourceSchema, allocateSchema };
