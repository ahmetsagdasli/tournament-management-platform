import request from 'supertest';

import { createApp } from '../src/app';
import { createTestUser } from './setup/factories';

const app = createApp();

describe('auth', () => {
  it('register/login succeed and return a token', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'Password123',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.token).toEqual(expect.any(String));
    expect(registerResponse.body.user).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: 'USER',
    });

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'ada@example.com',
      password: 'Password123',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toEqual(expect.any(String));
  });

  it('registration response contains no password_hash', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'Password123',
    });

    expect(response.status).toBe(201);
    expect(JSON.stringify(response.body)).not.toContain('password_hash');
  });

  it('role escalation via register body is rejected', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Mallory',
      email: 'mallory@example.com',
      password: 'Password123',
      role: 'ADMIN',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('duplicate email returns EMAIL_TAKEN from the constraint', async () => {
    await createTestUser({ email: 'taken@example.com' });

    const response = await request(app).post('/api/auth/register').send({
      name: 'Duplicate',
      email: 'taken@example.com',
      password: 'Password123',
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('unauthenticated protected request returns 401', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('tampered token returns 401', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('wrong password and unknown email return identical responses', async () => {
    await createTestUser({
      email: 'known@example.com',
      password: 'Password123',
    });

    const wrongPassword = await request(app).post('/api/auth/login').send({
      email: 'known@example.com',
      password: 'WrongPassword123',
    });
    const unknownEmail = await request(app).post('/api/auth/login').send({
      email: 'unknown@example.com',
      password: 'WrongPassword123',
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});
