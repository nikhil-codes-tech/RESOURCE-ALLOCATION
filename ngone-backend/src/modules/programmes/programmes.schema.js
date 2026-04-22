import { z } from 'zod';

export const createProgrammeSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(['EDUCATION', 'HEALTHCARE', 'WOMEN_EMPOWERMENT', 'LIVELIHOOD', 'GRASSROOTS', 'DISASTER_RESPONSE']),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  targetAmount: z.coerce.number().min(0).optional(),
  location: z.string().optional(),
  state: z.string().optional(),
});

export const updateProgrammeSchema = createProgrammeSchema.partial().extend({
  beneficiaries: z.coerce.number().min(0).optional(),
  raisedAmount: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export default { createProgrammeSchema, updateProgrammeSchema };
