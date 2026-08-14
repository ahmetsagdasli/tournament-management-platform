import bcrypt from 'bcrypt';

import { pool } from '../config/db';
import { signAccessToken } from '../config/jwt';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import type { PublicUser, UserRole } from '../types/domain';
import type { LoginInput, RegisterInput } from '../validators/authValidators';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const DUMMY_PASSWORD_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8XYCK9mPQUE2ihbZq48nn1gGyKhveS';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
}

function toPublicUser(row: Omit<UserRow, 'password_hash'>): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at.toISOString(),
  };
}

export async function registerUser(input: RegisterInput): Promise<{ user: PublicUser; token: string }> {
  const passwordHash = await bcrypt.hash(input.password, env.bcryptCost);

  const result = await pool.query<Omit<UserRow, 'password_hash'>>(
    `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'USER')
      RETURNING id, name, email, role, created_at
    `,
    [input.name, input.email, passwordHash],
  );

  const user = toPublicUser(result.rows[0]!);
  const token = signAccessToken({ sub: user.id, role: user.role });

  return { user, token };
}

export async function loginUser(input: LoginInput): Promise<{ user: PublicUser; token: string }> {
  const result = await pool.query<UserRow>(
    `
      SELECT id, name, email, password_hash, role, created_at
      FROM users
      WHERE email = $1
    `,
    [input.email],
  );

  const userRow = result.rows[0];
  const hashToCompare = userRow?.password_hash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await bcrypt.compare(input.password, hashToCompare);

  if (!userRow || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
  }

  const user = toPublicUser(userRow);
  const token = signAccessToken({ sub: user.id, role: user.role });

  return { user, token };
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const result = await pool.query<Omit<UserRow, 'password_hash'>>(
    `
      SELECT id, name, email, role, created_at
      FROM users
      WHERE id = $1
    `,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  return toPublicUser(user);
}
