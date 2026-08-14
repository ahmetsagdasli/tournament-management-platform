import type { PoolClient } from 'pg';

import { pool, withTransaction } from '../config/db';
import { AppError } from '../errors/AppError';
import type {
  Registration,
  RegistrationWithTournament,
  RegistrationWithUser,
  TournamentStatus,
  UserRole,
} from '../types/domain';

interface RegistrationRow {
  id: string;
  user_id: string;
  tournament_id: string;
  created_at: Date;
}

interface LockedTournamentRow {
  id: string;
  status: TournamentStatus;
  max_players: number;
}

interface RegistrationWithTournamentRow extends RegistrationRow {
  tournament_name: string;
  tournament_description: string;
  tournament_max_players: number;
  tournament_starts_at: Date;
  tournament_status: TournamentStatus;
  tournament_created_at: Date;
  tournament_registered_count: number;
}

interface RegistrationWithUserRow extends RegistrationRow {
  user_name: string;
  user_email: string;
  user_role: UserRole;
  user_created_at: Date;
}

function toRegistration(row: RegistrationRow): Registration {
  return {
    id: row.id,
    user_id: row.user_id,
    tournament_id: row.tournament_id,
    created_at: row.created_at.toISOString(),
  };
}

export async function registerForTournament(
  userId: string,
  tournamentId: string,
): Promise<Registration> {
  return withTransaction(async (client) => {
    const tournament = await lockTournament(client, tournamentId);

    if (!tournament) {
      throw new AppError(404, 'NOT_FOUND', 'Tournament not found');
    }

    if (tournament.status !== 'OPEN') {
      throw new AppError(409, 'TOURNAMENT_NOT_OPEN', 'Tournament is not open');
    }

    const countResult = await client.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM registrations
        WHERE tournament_id = $1
      `,
      [tournamentId],
    );

    const registeredCount = countResult.rows[0]!.count;

    if (registeredCount >= tournament.max_players) {
      throw new AppError(409, 'TOURNAMENT_FULL', 'Tournament is full');
    }

    const result = await client.query<RegistrationRow>(
      `
        INSERT INTO registrations (user_id, tournament_id)
        VALUES ($1, $2)
        RETURNING id, user_id, tournament_id, created_at
      `,
      [userId, tournamentId],
    );

    return toRegistration(result.rows[0]!);
  });
}

export async function listMyRegistrations(
  userId: string,
): Promise<RegistrationWithTournament[]> {
  const result = await pool.query<RegistrationWithTournamentRow>(
    `
      SELECT
        r.id,
        r.user_id,
        r.tournament_id,
        r.created_at,
        t.name AS tournament_name,
        t.description AS tournament_description,
        t.max_players AS tournament_max_players,
        t.starts_at AS tournament_starts_at,
        t.status AS tournament_status,
        t.created_at AS tournament_created_at,
        (
          SELECT COUNT(*)::int
          FROM registrations
          WHERE tournament_id = t.id
        ) AS tournament_registered_count
      FROM registrations r
      JOIN tournaments t ON t.id = r.tournament_id
      WHERE r.user_id = $1
      ORDER BY t.starts_at ASC
    `,
    [userId],
  );

  return result.rows.map((row) => ({
    ...toRegistration(row),
    tournament: {
      id: row.tournament_id,
      name: row.tournament_name,
      description: row.tournament_description,
      max_players: row.tournament_max_players,
      starts_at: row.tournament_starts_at.toISOString(),
      status: row.tournament_status,
      created_at: row.tournament_created_at.toISOString(),
      registered_count: row.tournament_registered_count,
    },
  }));
}

export async function listTournamentRegistrations(
  tournamentId: string,
): Promise<RegistrationWithUser[]> {
  const tournamentResult = await pool.query<{ id: string }>(
    'SELECT id FROM tournaments WHERE id = $1',
    [tournamentId],
  );

  if (!tournamentResult.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Tournament not found');
  }

  const result = await pool.query<RegistrationWithUserRow>(
    `
      SELECT
        r.id,
        r.user_id,
        r.tournament_id,
        r.created_at,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        u.created_at AS user_created_at
      FROM registrations r
      JOIN users u ON u.id = r.user_id
      WHERE r.tournament_id = $1
      ORDER BY r.created_at ASC
    `,
    [tournamentId],
  );

  return result.rows.map((row) => ({
    ...toRegistration(row),
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      role: row.user_role,
      created_at: row.user_created_at.toISOString(),
    },
  }));
}

async function lockTournament(
  client: PoolClient,
  tournamentId: string,
): Promise<LockedTournamentRow | null> {
  const result = await client.query<LockedTournamentRow>(
    `
      SELECT id, status, max_players
      FROM tournaments
      WHERE id = $1
      FOR UPDATE
    `,
    [tournamentId],
  );

  return result.rows[0] ?? null;
}
