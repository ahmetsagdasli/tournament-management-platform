import request from 'supertest';

import { createApp } from '../src/app';
import { pool } from '../src/config/db';
import {
  createTestRegistration,
  createTestTournament,
  createTestUser,
} from './setup/factories';

const app = createApp();

async function tokenForUser(user: { email: string; password: string }): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({
    email: user.email,
    password: user.password,
  });

  return response.body.token;
}

describe('registration', () => {
  it('user can register for a tournament', async () => {
    const user = await createTestUser();
    const tournament = await createTestTournament();
    const token = await tokenForUser(user);

    const response = await request(app)
      .post(`/api/tournaments/${tournament.id}/register`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.registration).toMatchObject({
      user_id: user.id,
      tournament_id: tournament.id,
    });
  });

  it('duplicate registration returns ALREADY_REGISTERED', async () => {
    const user = await createTestUser();
    const tournament = await createTestTournament();
    const token = await tokenForUser(user);
    await createTestRegistration(user.id, tournament.id);

    const response = await request(app)
      .post(`/api/tournaments/${tournament.id}/register`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ALREADY_REGISTERED');
  });

  it('user_id in request body is ignored', async () => {
    const attacker = await createTestUser({ email: 'attacker@example.com' });
    const victim = await createTestUser({ email: 'victim@example.com' });
    const tournament = await createTestTournament();
    const token = await tokenForUser(attacker);

    const response = await request(app)
      .post(`/api/tournaments/${tournament.id}/register`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: victim.id });

    expect(response.status).toBe(201);

    const rows = await pool.query<{ user_id: string }>(
      'SELECT user_id FROM registrations WHERE tournament_id = $1',
      [tournament.id],
    );

    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]!.user_id).toBe(attacker.id);
  });

  it('full tournament returns TOURNAMENT_FULL', async () => {
    const existing = await createTestUser({ email: 'existing@example.com' });
    const user = await createTestUser({ email: 'new@example.com' });
    const tournament = await createTestTournament({ max_players: 1 });
    const token = await tokenForUser(user);
    await createTestRegistration(existing.id, tournament.id);

    const response = await request(app)
      .post(`/api/tournaments/${tournament.id}/register`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('TOURNAMENT_FULL');
  });

  it('CLOSED and COMPLETED tournaments return TOURNAMENT_NOT_OPEN', async () => {
    const user = await createTestUser();
    const token = await tokenForUser(user);
    const closed = await createTestTournament({ status: 'CLOSED' });
    const completed = await createTestTournament({ status: 'COMPLETED' });

    const closedResponse = await request(app)
      .post(`/api/tournaments/${closed.id}/register`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    const completedResponse = await request(app)
      .post(`/api/tournaments/${completed.id}/register`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(closedResponse.status).toBe(409);
    expect(closedResponse.body.error.code).toBe('TOURNAMENT_NOT_OPEN');
    expect(completedResponse.status).toBe(409);
    expect(completedResponse.body.error.code).toBe('TOURNAMENT_NOT_OPEN');
  });

  it('/api/me/registrations returns only the caller rows', async () => {
    const caller = await createTestUser({ email: 'caller@example.com' });
    const other = await createTestUser({ email: 'other@example.com' });
    const callerTournament = await createTestTournament({ name: 'Caller Cup' });
    const otherTournament = await createTestTournament({ name: 'Other Cup' });
    const token = await tokenForUser(caller);

    await createTestRegistration(caller.id, callerTournament.id);
    await createTestRegistration(other.id, otherTournament.id);

    const response = await request(app)
      .get('/api/me/registrations')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.registrations).toHaveLength(1);
    expect(response.body.registrations[0].user_id).toBe(caller.id);
    expect(response.body.registrations[0].tournament.name).toBe('Caller Cup');
  });

  it('nonexistent tournament registration returns 404', async () => {
    const user = await createTestUser();
    const token = await tokenForUser(user);

    const response = await request(app)
      .post('/api/tournaments/00000000-0000-4000-8000-000000000000/register')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
