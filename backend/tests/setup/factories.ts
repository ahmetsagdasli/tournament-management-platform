// Test data builders that insert directly into Postgres, bypassing the
// HTTP/service layers entirely. Used to set up state a test needs (e.g. "a
// tournament that is already full") without going through the API for
// every fixture, which keeps tests focused on the behavior under test.
import bcrypt from 'bcrypt';

import { env } from '../../src/config/env';
import { pool } from '../../src/config/db';
import type { TournamentStatus, UserRole } from '../../src/types/domain';

// Ensures each factory call produces a unique name/email within a single
// test run, without callers having to invent unique values themselves.
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

// Inserts a user directly (real bcrypt hash included, so the returned
// plaintext `password` can be used to log in via the API in tests).
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

// Inserts a tournament directly. Defaults to `starts_at` one day in the
// future and status OPEN, since most tests care about registration
// behavior and not about the tournament's own fields.
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

// Inserts a registration directly, skipping registerForTournament's
// capacity/lock logic entirely — useful for tests that need existing
// registrations set up as a precondition (e.g. "tournament is already
// full") rather than testing the registration flow itself.
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
