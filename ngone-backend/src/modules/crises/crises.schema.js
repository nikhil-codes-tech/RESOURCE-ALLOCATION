import { z } from 'zod';

export const createCrisisSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(['FLOOD', 'FIRE', 'MEDICAL', 'FOOD_SHORTAGE', 'SHELTER', 'WATER_CRISIS', 'EARTHQUAKE', 'CYCLONE', 'DROUGHT']),
  urgency: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'EXTREME']).default('HIGH'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  location: z.string().min(2),
  state: z.string().optional(),
  district: z.string().optional(),
  skillsRequired: z.array(z.string()).default([]),
  volunteersNeeded: z.coerce.number().min(1).max(1000).default(5),
  estimatedAffected: z.coerce.number().optional(),
  resourcesNeeded: z.any().optional(),
});

export const updateCrisisSchema = createCrisisSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(500).default(100),
});

export default { createCrisisSchema, updateCrisisSchema, updateStatusSchema, nearbyQuerySchema };
