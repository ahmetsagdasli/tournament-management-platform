import bcrypt from 'bcrypt';

import { env } from '../../src/config/env';
import { pool } from '../../src/config/db';
import type { TournamentStatus, UserRole } from '../../src/types/domain';

let counter = 0;

export interface TestUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface TestTournament {
  id: string;
  name: string;
  status: TournamentStatus;
  max_players: number;
}

export async function createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
  counter += 1;

  const password = overrides.password ?? 'Password123';
  const user = {
    name: overrides.name ?? `User ${counter}`,
    email: overrides.email ?? `user${counter}@example.com`,
    password,
    role: overrides.role ?? 'USER',
  };
  const passwordHash = await bcrypt.hash(password, env.bcryptCost);

  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [user.name, user.email.toLowerCase(), passwordHash, user.role],
  );

  return {
    id: result.rows[0]!.id,
    ...user,
    email: user.email.toLowerCase(),
  };
}

export async function createTestTournament(
  overrides: Partial<TestTournament> = {},
): Promise<TestTournament> {
  counter += 1;

  const tournament = {
    name: overrides.name ?? `Tournament ${counter}`,
    description: 'A test tournament',
    max_players: overrides.max_players ?? 16,
    starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: overrides.status ?? 'OPEN',
  };

  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO tournaments (name, description, max_players, starts_at, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [
      tournament.name,
      tournament.description,
      tournament.max_players,
      tournament.starts_at,
      tournament.status,
    ],
  );

  return {
    id: result.rows[0]!.id,
    name: tournament.name,
    status: tournament.status,
    max_players: tournament.max_players,
  };
}

export async function createTestRegistration(
  userId: string,
  tournamentId: string,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO registrations (user_id, tournament_id)
      VALUES ($1, $2)
    `,
    [userId, tournamentId],
  );
}
