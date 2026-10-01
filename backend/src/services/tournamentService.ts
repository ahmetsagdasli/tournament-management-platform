import { pool } from '../config/db';
import { AppError } from '../errors/AppError';
import type { Tournament, TournamentStatus } from '../types/domain';
import type {
  CreateTournamentInput,
  TournamentQuery,
  UpdateTournamentInput,
} from '../validators/tournamentValidators';

interface TournamentRow {
  id: string;
  name: string;
  description: string;
  max_players: number;
  starts_at: Date;
  status: TournamentStatus;
  created_at: Date;
  registered_count: number;
}

// Status only ever moves forward: OPEN -> CLOSED -> COMPLETED.
const ALLOWED_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  OPEN: ['CLOSED'],
  CLOSED: ['COMPLETED'],
  COMPLETED: [],
};

// Maps UpdateTournamentInput fields to column names for the dynamic SET
// clause in updateTournament.
const UPDATABLE_COLUMNS = [
  ['name', 'name'],
  ['description', 'description'],
  ['max_players', 'max_players'],
  ['starts_at', 'starts_at'],
  ['status', 'status'],
] as const satisfies ReadonlyArray<readonly [keyof UpdateTournamentInput, string]>;

function toTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    max_players: row.max_players,
    starts_at: row.starts_at.toISOString(),
    status: row.status,
    created_at: row.created_at.toISOString(),
    registered_count: row.registered_count,
  };
}

export async function listTournaments(query: TournamentQuery): Promise<Tournament[]> {
  const params: unknown[] = [];
  const where = query.status ? 'WHERE t.status = $1' : '';

  if (query.status) {
    params.push(query.status);
  }

  const result = await pool.query<TournamentRow>(
    `
      SELECT
        t.id,
        t.name,
        t.description,
        t.max_players,
        t.starts_at,
        t.status,
        t.created_at,
        COUNT(r.id)::int AS registered_count
      FROM tournaments t
      LEFT JOIN registrations r ON r.tournament_id = t.id
      ${where}
      GROUP BY t.id
      ORDER BY t.starts_at ASC
    `,
    params,
  );

  return result.rows.map(toTournament);
}

export async function getTournament(id: string): Promise<Tournament> {
  const tournament = await findTournament(id);

  if (!tournament) {
    throw new AppError(404, 'NOT_FOUND', 'Tournament not found');
  }

  return tournament;
}

// ADMIN-only. New tournaments always start OPEN (table default).
export async function createTournament(input: CreateTournamentInput): Promise<Tournament> {
  const result = await pool.query<TournamentRow>(
    `
      INSERT INTO tournaments (name, description, max_players, starts_at)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        name,
        description,
        max_players,
        starts_at,
        status,
        created_at,
        0::int AS registered_count
    `,
    [input.name, input.description, input.max_players, input.starts_at],
  );

  return toTournament(result.rows[0]!);
}

// ADMIN-only. Enforces two invariants a plain UPDATE can't: status can only
// move forward (ALLOWED_TRANSITIONS), and capacity can't drop below the
// current registration count.
export async function updateTournament(
  id: string,
  input: UpdateTournamentInput,
): Promise<Tournament> {
  const current = await getTournament(id);

  if (input.status && input.status !== current.status) {
    const allowedStatuses = ALLOWED_TRANSITIONS[current.status];

    if (!allowedStatuses.includes(input.status)) {
      throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Invalid status transition');
    }
  }

  if (
    typeof input.max_players === 'number' &&
    input.max_players < current.registered_count
  ) {
    throw new AppError(
      409,
      'CAPACITY_BELOW_REGISTRATIONS',
      'max_players cannot be lower than current registrations',
    );
  }

  // Build SET col = $1, ... only for fields that were actually provided.
  const values: unknown[] = [];
  const assignments: string[] = [];

  for (const [key, column] of UPDATABLE_COLUMNS) {
    if (input[key] !== undefined) {
      values.push(input[key]);
      assignments.push(`${column} = $${values.length}`);
    }
  }

  values.push(id);

  const result = await pool.query<TournamentRow>(
    `
      UPDATE tournaments
      SET ${assignments.join(', ')}
      WHERE id = $${values.length}
      RETURNING
        id,
        name,
        description,
        max_players,
        starts_at,
        status,
        created_at,
        (
          SELECT COUNT(*)::int
          FROM registrations
          WHERE tournament_id = tournaments.id
        ) AS registered_count
    `,
    values,
  );

  return toTournament(result.rows[0]!);
}

// ADMIN-only. Blocked once anyone has registered, so a tournament's
// registration history can't be silently wiped (registrations cascade-
// delete otherwise).
export async function deleteTournament(id: string): Promise<void> {
  const tournament = await getTournament(id);

  if (tournament.registered_count > 0) {
    throw new AppError(
      409,
      'HAS_REGISTRATIONS',
      'Cannot delete a tournament that has registrations',
    );
  }

  await pool.query('DELETE FROM tournaments WHERE id = $1', [id]);
}

async function findTournament(id: string): Promise<Tournament | null> {
  const result = await pool.query<TournamentRow>(
    `
      SELECT
        t.id,
        t.name,
        t.description,
        t.max_players,
        t.starts_at,
        t.status,
        t.created_at,
        COUNT(r.id)::int AS registered_count
      FROM tournaments t
      LEFT JOIN registrations r ON r.tournament_id = t.id
      WHERE t.id = $1
      GROUP BY t.id
    `,
    [id],
  );

  const row = result.rows[0];
  return row ? toTournament(row) : null;
}
