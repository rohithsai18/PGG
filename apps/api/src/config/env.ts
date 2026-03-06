import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://demo:demo@localhost:5432/demo'),
  JWT_SECRET: z.string().default('demo-super-secret-jwt-key'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DEMO_OTP_CODE: z.string().default('123456'),
  OTP_TTL_MINUTES: z.coerce.number().default(10),
  CORS_ORIGINS: z.string().default('*'),
  CHARGE_GST_PERCENT: z.coerce.number().default(5),
  CHARGE_REGISTRATION_PERCENT: z.coerce.number().default(2),
  CHARGE_OTHER_FIXED: z.coerce.number().default(250000),
  COST_SHEET_FORMULA_VERSION: z.string().default('v1'),
  BROCHURE_FILE_PATH: z.string().default('assets/brochure.pdf'),
  CLOUDINARY_CLOUD_NAME: z.string().default('demo-cloud'),
  CLOUDINARY_API_KEY: z.string().default('demo-key'),
  CLOUDINARY_API_SECRET: z.string().default('demo-secret'),
  CLOUDINARY_FOLDER: z.string().default('real-estate-demo')
});

export const env = envSchema.parse(process.env);

if (env.DATABASE_URL.includes('@host:5432')) {
  throw new Error(
    'DATABASE_URL is still using placeholder host. Update apps/api/.env with a real Postgres host (localhost, Neon, etc).'
  );
}

export const corsOrigins = env.CORS_ORIGINS === '*'
  ? '*'
  : env.CORS_ORIGINS.split(',').map((o) => o.trim());
