import bcrypt from 'bcrypt';
import { z } from 'zod';

import { closePool, pool } from '../config/db';
import { env } from '../config/env';

const seedAdminSchema = z.object({
  ADMIN_NAME: z.string().trim().min(1),
  ADMIN_EMAIL: z.string().email().transform((email) => email.toLowerCase()),
  ADMIN_PASSWORD: z
    .string()
    .min(8)
    .max(72)
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a digit'),
});

async function main(): Promise<void> {
  const parsedSeedEnv = seedAdminSchema.safeParse(process.env);

  if (!parsedSeedEnv.success) {
    console.error('Invalid admin seed configuration', parsedSeedEnv.error.flatten().fieldErrors);
    process.exitCode = 1;
    return;
  }

  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = parsedSeedEnv.data;
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, env.bcryptCost);

  const result = await pool.query<{ id: string; email: string; role: 'ADMIN' }>(
    `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'ADMIN')
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = 'ADMIN'
      RETURNING id, email, role
    `,
    [ADMIN_NAME, ADMIN_EMAIL, passwordHash],
  );

  console.log('Seeded admin user', result.rows[0]);
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed admin user', error);
    process.exitCode = 1;
  })
  .finally(closePool);
