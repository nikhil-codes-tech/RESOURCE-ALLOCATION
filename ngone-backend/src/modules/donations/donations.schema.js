import { z } from 'zod';

export const createDonationSchema = z.object({
  ngoId: z.string().min(1),
  amount: z.coerce.number().min(1, 'Minimum donation is ₹1'),
  type: z.enum(['ONE_TIME', 'MONTHLY', 'ANNUAL']).default('ONE_TIME'),
  message: z.string().max(500).optional(),
  isAnonymous: z.boolean().default(false),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN').optional(),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export default { createDonationSchema, verifyPaymentSchema };
