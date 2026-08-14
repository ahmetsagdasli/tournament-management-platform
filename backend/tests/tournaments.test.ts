import request from 'supertest';

import { createApp } from '../src/app';
import {
  createTestRegistration,
  createTestTournament,
  createTestUser,
} from './setup/factories';

const app = createApp();

async function login(role: 'USER' | 'ADMIN' = 'USER'): Promise<string> {
  const user = await createTestUser({ role });
  const response = await request(app).post('/api/auth/login').send({
    email: user.email,
    password: user.password,
  });

  return response.body.token;
}

describe('tournaments', () => {
  it('normal user cannot create a tournament', async () => {
    const token = await login('USER');

    const response = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Open Cup',
        description: 'A tournament',
        max_players: 8,
        starts_at: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('admin can create a tournament', async () => {
    const token = await login('ADMIN');

    const response = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Admin Cup',
        description: 'A tournament',
        max_players: 8,
        starts_at: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body.tournament).toMatchObject({
      name: 'Admin Cup',
      status: 'OPEN',
      registered_count: 0,
    });
  });

  it('registered_count is a number, not a string', async () => {
    const tournament = await createTestTournament();
    const user = await createTestUser();
    await createTestRegistration(user.id, tournament.id);

    const response = await request(app).get(`/api/tournaments/${tournament.id}`);

    expect(response.status).toBe(200);
    expect(response.body.tournament.registered_count).toBe(1);
    expect(typeof response.body.tournament.registered_count).toBe('number');
  });

  it('malformed uuid returns 400', async () => {
    const response = await request(app).get('/api/tournaments/not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('nonexistent tournament returns 404', async () => {
    const response = await request(app).get('/api/tournaments/00000000-0000-4000-8000-000000000000');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('all six status transitions behave per the table', async () => {
    const token = await login('ADMIN');
    const openToClosedTournament = await createTestTournament({ status: 'OPEN' });
    const openToCompletedTournament = await createTestTournament({ status: 'OPEN' });
    const closedToOpenTournament = await createTestTournament({ status: 'CLOSED' });
    const closedToCompletedTournament = await createTestTournament({ status: 'CLOSED' });
    const completedToOpenTournament = await createTestTournament({ status: 'COMPLETED' });
    const completedToClosedTournament = await createTestTournament({ status: 'COMPLETED' });

    const openToClosed = await request(app)
      .patch(`/api/tournaments/${openToClosedTournament.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CLOSED' });
    const openToCompleted = await request(app)
      .patch(`/api/tournaments/${openToCompletedTournament.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED' });
    const closedToOpen = await request(app)
      .patch(`/api/tournaments/${closedToOpenTournament.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'OPEN' });
    const closedToCompleted = await request(app)
      .patch(`/api/tournaments/${closedToCompletedTournament.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED' });
    const completedToOpen = await request(app)
      .patch(`/api/tournaments/${completedToOpenTournament.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'OPEN' });
    const completedToClosed = await request(app)
      .patch(`/api/tournaments/${completedToClosedTournament.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CLOSED' });

    expect(openToClosed.status).toBe(200);
    expect(openToCompleted.status).toBe(409);
    expect(closedToOpen.status).toBe(409);
    expect(closedToCompleted.status).toBe(200);
    expect(completedToOpen.status).toBe(409);
    expect(completedToClosed.status).toBe(409);
  });

  it('reducing capacity below current registrations returns 409', async () => {
    const token = await login('ADMIN');
    const tournament = await createTestTournament({ max_players: 5 });
    const userOne = await createTestUser();
    const userTwo = await createTestUser();
    await createTestRegistration(userOne.id, tournament.id);
    await createTestRegistration(userTwo.id, tournament.id);

    const response = await request(app)
      .patch(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ max_players: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CAPACITY_BELOW_REGISTRATIONS');
  });

  it('admin can view registered players', async () => {
    const token = await login('ADMIN');
    const tournament = await createTestTournament();
    const player = await createTestUser({ email: 'player@example.com' });
    await createTestRegistration(player.id, tournament.id);

    const response = await request(app)
      .get(`/api/tournaments/${tournament.id}/registrations`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.registrations).toHaveLength(1);
    expect(response.body.registrations[0].user.email).toBe('player@example.com');
    expect(JSON.stringify(response.body)).not.toContain('password_hash');
  });

  it('normal user cannot delete a tournament', async () => {
    const token = await login('USER');
    const tournament = await createTestTournament();

    const response = await request(app)
      .delete(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('admin can delete a tournament with no registrations', async () => {
    const token = await login('ADMIN');
    const tournament = await createTestTournament();

    const response = await request(app)
      .delete(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(204);

    const getResponse = await request(app).get(`/api/tournaments/${tournament.id}`);
    expect(getResponse.status).toBe(404);
  });

  it('admin cannot delete a tournament that has registrations', async () => {
    const token = await login('ADMIN');
    const tournament = await createTestTournament();
    const player = await createTestUser();
    await createTestRegistration(player.id, tournament.id);

    const response = await request(app)
      .delete(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('HAS_REGISTRATIONS');
  });

  it('deleting a nonexistent tournament returns 404', async () => {
    const token = await login('ADMIN');

    const response = await request(app)
      .delete('/api/tournaments/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('status filter returns matching tournaments', async () => {
    await createTestTournament({ status: 'OPEN' });
    await createTestTournament({ status: 'CLOSED' });

    const response = await request(app).get('/api/tournaments?status=CLOSED');

    expect(response.status).toBe(200);
    expect(response.body.tournaments).toHaveLength(1);
    expect(response.body.tournaments[0].status).toBe('CLOSED');
  });
});
