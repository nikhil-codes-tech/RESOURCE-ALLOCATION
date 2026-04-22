import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // ── App ──
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  API_PREFIX: z.string().default('/api'),

  // ── Database ──
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // ── Redis ──
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // ── JWT ──
  ACCESS_TOKEN_SECRET: z.string().min(32, 'ACCESS_TOKEN_SECRET must be at least 32 chars'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 chars'),
  ACCESS_TOKEN_EXPIRES: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES: z.string().default('7d'),
  RESET_TOKEN_EXPIRES: z.string().default('1h'),

  // ── Google OAuth ──
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  // ── Microsoft OAuth ──
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CALLBACK_URL: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().default('common'),

  // ── AWS SES ──
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('hello@ngone.in'),
  EMAIL_FROM_NAME: z.string().default('NGone Platform'),

  // ── MSG91 ──
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
  MSG91_SENDER_ID: z.string().default('NGONE'),

  // ── Twilio ──
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE: z.string().optional(),

  // ── Cloudinary ──
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('ngone'),

  // ── Razorpay ──
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // ── DARPAN ──
  DARPAN_API_URL: z.string().default('https://ngodarpan.gov.in/api/v1'),
  DARPAN_API_KEY: z.string().optional(),

  // ── Feature Flags ──
  ENABLE_SMS: z.coerce.boolean().default(true),
  ENABLE_EMAIL: z.coerce.boolean().default(true),
  ENABLE_PAYMENTS: z.coerce.boolean().default(true),
  ENABLE_SOCKET: z.coerce.boolean().default(true),
});

let env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Environment validation failed:');
  if (error instanceof z.ZodError) {
    error.issues.forEach((issue) => {
      console.error(`   → ${issue.path.join('.')}: ${issue.message}`);
    });
  }
  process.exit(1);
}

export default env;
