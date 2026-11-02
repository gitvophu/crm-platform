import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Signs access tokens (HS256, ADR-0004). At least 32 characters (256 bits for HMAC-SHA256).
  JWT_SECRET: z.string().min(32),
  // `Secure` auth cookies (ADR-0004). Browsers accept them on http://localhost except Safari;
  // set false to open the dev stack over plain HTTP from another device (http://192.168.x.x).
  COOKIE_SECURE: z.stringbool().default(true),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // pino levels; `silent` turns logging off (tests).
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/** Used as `validate` of ConfigModule: fail fast at startup with every invalid variable listed. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
