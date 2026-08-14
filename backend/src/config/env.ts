import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().min(1),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment configuration', parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

const values = parsedEnv.data;

export const env = {
  nodeEnv: values.NODE_ENV,
  port: values.PORT,
  databaseUrl: values.NODE_ENV === 'test' ? values.TEST_DATABASE_URL : values.DATABASE_URL,
  jwtSecret: values.JWT_SECRET,
  corsOrigins: values.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  bcryptCost: values.BCRYPT_COST,
} as const;
