import { z } from 'zod';

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(500).default(50),
  skills: z.string().optional(),
});

export const updateSkillsSchema = z.object({
  skills: z.array(z.string().min(1).max(50)).min(1).max(20),
});

export const updateAvailabilitySchema = z.object({
  availability: z.record(z.array(z.string())),
});

export const updateLocationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export const updateOnlineSchema = z.object({
  isOnline: z.boolean(),
});

export const checkInSchema = z.object({
  taskId: z.string().min(1),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

export const checkOutSchema = z.object({
  taskId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export default {
  nearbyQuerySchema, updateSkillsSchema, updateAvailabilitySchema,
  updateLocationSchema, updateOnlineSchema, checkInSchema, checkOutSchema,
};
