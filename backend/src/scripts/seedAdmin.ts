// One-off script (`npm run seed:admin`) that creates or promotes the admin
// account defined by ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD in .env. Safe to
// re-run: an existing row for that email is updated in place rather than
// causing a duplicate-key error.
import bcrypt from 'bcrypt';
import { z } from 'zod';

import { closePool, pool } from '../config/db';
import { env } from '../config/env';

// A separate schema from authValidators' registerSchema: this script reads
// straight from process.env (three specific ADMIN_* vars), not from an API
// request body.
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

  // ON CONFLICT upserts: if a user with this email already exists (e.g.
  // from a previous run, or a self-registered account), it is updated in
  // place and promoted to ADMIN rather than erroring out.
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
