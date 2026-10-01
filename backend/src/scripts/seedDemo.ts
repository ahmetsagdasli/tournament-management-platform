// One-off script (`npm run seed:demo`) that populates the database with a
// handful of demo players, tournaments in each status (OPEN/CLOSED/
// COMPLETED), and some registrations between them — useful for manually
// exploring the frontend without registering accounts by hand. Safe to
// re-run: existing rows are matched by email/name and left as-is or
// updated rather than duplicated.
import bcrypt from 'bcrypt';
import type { PoolClient } from 'pg';

import { closePool, withTransaction } from '../config/db';
import { env } from '../config/env';
import type { TournamentStatus, UserRole } from '../types/domain';

interface DemoUser {
  name: string;
  email: string;
  role: UserRole;
}

interface DemoTournament {
  name: string;
  description: string;
  max_players: number;
  starts_at: Date;
  status: TournamentStatus;
}

const demoUsers: DemoUser[] = [
  { name: 'Ada Demir', email: 'ada.player@example.com', role: 'USER' },
  { name: 'Mert Kaya', email: 'mert.player@example.com', role: 'USER' },
  { name: 'Elif Arslan', email: 'elif.player@example.com', role: 'USER' },
  { name: 'Can Yildiz', email: 'can.player@example.com', role: 'USER' },
  { name: 'Zeynep Acar', email: 'zeynep.player@example.com', role: 'USER' },
];

const demoTournaments: DemoTournament[] = [
  {
    name: 'Istanbul Chess Open',
    description: 'A weekend chess tournament for ranked and casual players.',
    max_players: 16,
    starts_at: daysFromNow(7),
    status: 'OPEN',
  },
  {
    name: 'React Knockout Cup',
    description: 'Single-day coding challenge with a compact knockout format.',
    max_players: 8,
    starts_at: daysFromNow(12),
    status: 'OPEN',
  },
  {
    name: 'Summer Valorant Clash',
    description: 'Closed esports event with registered teams locked in.',
    max_players: 5,
    starts_at: daysFromNow(4),
    status: 'CLOSED',
  },
  {
    name: 'Autumn Board Game Finals',
    description: 'Completed tabletop finals kept for historical browsing.',
    max_players: 12,
    // Negative offset: this tournament already happened, matching its
    // COMPLETED status. createTournamentSchema would reject a past
    // starts_at, but this script writes directly via SQL and bypasses that
    // API-level validation on purpose.
    starts_at: daysFromNow(-6),
    status: 'COMPLETED',
  },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('Password123', env.bcryptCost);

  // Everything happens in one transaction so a failure partway through
  // (e.g. a missing lookup in `register`) leaves the database untouched
  // instead of half-seeded.
  await withTransaction(async (client) => {
    // Maps from a stable key (email / tournament name) to the row's
    // generated UUID, so `register` below can look up ids by name instead
    // of threading id variables through every call site.
    const users = new Map<string, string>();
    const tournaments = new Map<string, string>();

    for (const user of demoUsers) {
      const result = await client.query<{ id: string }>(
        `
          INSERT INTO users (name, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (email)
          DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `,
        [user.name, user.email, passwordHash, user.role],
      );
      users.set(user.email, result.rows[0]!.id);
    }

    for (const tournament of demoTournaments) {
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM tournaments WHERE name = $1 LIMIT 1',
        [tournament.name],
      );

      if (existing.rows[0]) {
        tournaments.set(tournament.name, existing.rows[0].id);
        continue;
      }

      const result = await client.query<{ id: string }>(
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
      tournaments.set(tournament.name, result.rows[0]!.id);
    }

    await register(client, users, tournaments, 'ada.player@example.com', 'Istanbul Chess Open');
    await register(client, users, tournaments, 'mert.player@example.com', 'Istanbul Chess Open');
    await register(client, users, tournaments, 'elif.player@example.com', 'Istanbul Chess Open');
    await register(client, users, tournaments, 'can.player@example.com', 'React Knockout Cup');
    await register(client, users, tournaments, 'zeynep.player@example.com', 'React Knockout Cup');
    await register(client, users, tournaments, 'ada.player@example.com', 'Summer Valorant Clash');
    await register(client, users, tournaments, 'mert.player@example.com', 'Summer Valorant Clash');
    await register(client, users, tournaments, 'elif.player@example.com', 'Summer Valorant Clash');
    await register(client, users, tournaments, 'can.player@example.com', 'Autumn Board Game Finals');
  });

  console.log('Seeded demo tournaments, players, and registrations');
}

// Looks up a demo user/tournament by their stable keys and inserts a
// registration, ignoring the insert if it already exists (so re-running
// the script is a no-op rather than an error).
async function register(
  client: PoolClient,
  users: Map<string, string>,
  tournaments: Map<string, string>,
  email: string,
  tournamentName: string,
): Promise<void> {
  const userId = users.get(email);
  const tournamentId = tournaments.get(tournamentName);

  if (!userId || !tournamentId) {
    throw new Error(`Missing demo data for ${email} / ${tournamentName}`);
  }

  await client.query(
    `
      INSERT INTO registrations (user_id, tournament_id)
      VALUES ($1, $2)
      ON CONFLICT ON CONSTRAINT registrations_user_tournament_unique
      DO NOTHING
    `,
    [userId, tournamentId],
  );
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed demo data', error);
    process.exitCode = 1;
  })
  .finally(closePool);
