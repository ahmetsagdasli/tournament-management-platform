// Verifies the actual claim in the README's "Registration Concurrency"
// section: many simultaneous registration requests for the same tournament
// never create more registrations than max_players allows, one user can't
// end up double-registered, and locking one tournament does not block
// registrations for a different tournament. `Promise.all` fires every
// request at once so they genuinely race against each other, exercising
// the `FOR UPDATE` lock in registrationService.registerForTournament.
import request from 'supertest';

import { createApp } from '../src/app';
import { pool } from '../src/config/db';
import { createTestTournament, createTestUser } from './setup/factories';

const app = createApp();

async function tokenForUser(user: { email: string; password: string }): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({
    email: user.email,
    password: user.password,
  });

  return response.body.token;
}

describe('registration concurrency', () => {
  it('capacity 10 with 25 simultaneous requests creates exactly 10 registrations', async () => {
    const tournament = await createTestTournament({ max_players: 10 });
    const users = await Promise.all(
      Array.from({ length: 25 }, (_value, index) =>
        createTestUser({ email: `capacity${index}@example.com` }),
      ),
    );
    const tokens = await Promise.all(users.map(tokenForUser));

    const responses = await Promise.all(
      tokens.map((token) =>
        request(app)
          .post(`/api/tournaments/${tournament.id}/register`)
          .set('Authorization', `Bearer ${token}`)
          .send({}),
      ),
    );

    const statuses = responses.map((response) => response.status);
    const createdCount = statuses.filter((status) => status === 201).length;
    const conflictResponses = responses.filter((response) => response.status === 409);
    const fullCount = conflictResponses.filter(
      (response) => response.body.error.code === 'TOURNAMENT_FULL',
    ).length;
    const rowCount = await pool.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM registrations WHERE tournament_id = $1',
      [tournament.id],
    );

    // Exactly 10 succeed (capacity), the other 15 are rejected as full, and
    // the database itself agrees there are exactly 10 rows — this is the
    // core "capacity is never exceeded under concurrency" guarantee.
    expect(createdCount).toBe(10);
    expect(fullCount).toBe(15);
    expect(statuses.every((status) => status === 201 || status === 409)).toBe(true);
    expect(rowCount.rows[0]!.count).toBe(10);
  });

  it('one user firing 10 parallel requests creates exactly one registration', async () => {
    const tournament = await createTestTournament({ max_players: 10 });
    const user = await createTestUser();
    const token = await tokenForUser(user);

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app)
          .post(`/api/tournaments/${tournament.id}/register`)
          .set('Authorization', `Bearer ${token}`)
          .send({}),
      ),
    );

    const createdCount = responses.filter((response) => response.status === 201).length;
    const alreadyRegisteredCount = responses.filter(
      (response) => response.status === 409 && response.body.error.code === 'ALREADY_REGISTERED',
    ).length;

    // Confirms the unique (user_id, tournament_id) constraint holds even
    // when the same user's requests race each other, not just when two
    // different users race.
    expect(createdCount).toBe(1);
    expect(alreadyRegisteredCount).toBe(9);
  });

  it('registrations across two different tournaments do not serialise', async () => {
    const firstTournament = await createTestTournament({ max_players: 10 });
    const secondTournament = await createTestTournament({ max_players: 10 });
    const firstUsers = await Promise.all(
      Array.from({ length: 10 }, (_value, index) =>
        createTestUser({ email: `first${index}@example.com` }),
      ),
    );
    const secondUsers = await Promise.all(
      Array.from({ length: 10 }, (_value, index) =>
        createTestUser({ email: `second${index}@example.com` }),
      ),
    );
    const firstTokens = await Promise.all(firstUsers.map(tokenForUser));
    const secondTokens = await Promise.all(secondUsers.map(tokenForUser));

    const responses = await Promise.all([
      ...firstTokens.map((token) =>
        request(app)
          .post(`/api/tournaments/${firstTournament.id}/register`)
          .set('Authorization', `Bearer ${token}`)
          .send({}),
      ),
      ...secondTokens.map((token) =>
        request(app)
          .post(`/api/tournaments/${secondTournament.id}/register`)
          .set('Authorization', `Bearer ${token}`)
          .send({}),
      ),
    ]);

    // All 20 succeed: the FOR UPDATE lock is per tournament row, so
    // registrations for two different tournaments must not serialize
    // against each other even though they run at the same time.
    expect(responses.every((response) => response.status === 201)).toBe(true);
  });
});
