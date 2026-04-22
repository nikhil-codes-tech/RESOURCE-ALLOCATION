import { z } from 'zod';

export const createNGOSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  websiteUrl: z.string().url().optional(),
  registrationNo: z.string().optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format').optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode').optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().email().optional(),
  foundedYear: z.coerce.number().min(1900).max(2030).optional(),
  focusAreas: z.array(z.string()).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

export const updateNGOSchema = createNGOSchema.partial();

export const verifyDarpanSchema = z.object({
  darpanId: z.string().min(5, 'Invalid DARPAN ID'),
});

export default { createNGOSchema, updateNGOSchema, verifyDarpanSchema };
