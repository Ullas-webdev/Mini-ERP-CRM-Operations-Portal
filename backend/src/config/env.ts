import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z
    .string({
      required_error: 'DATABASE_URL environment variable is required',
    })
    .min(1, 'DATABASE_URL cannot be empty'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000,http://localhost:5173')
    .transform((val) => val.split(',').map((origin) => origin.trim())),
  JWT_SECRET: z
    .string({
      required_error: 'JWT_SECRET environment variable is required',
    })
    .min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_REFRESH_SECRET: z
    .string({
      required_error: 'JWT_REFRESH_SECRET environment variable is required',
    })
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters long'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
