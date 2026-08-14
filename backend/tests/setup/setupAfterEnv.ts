import { closePool, pool } from '../../src/config/db';

beforeEach(async () => {
  await pool.query('TRUNCATE registrations, tournaments, users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await closePool();
});
