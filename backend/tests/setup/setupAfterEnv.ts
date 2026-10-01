// Jest `setupFilesAfterEnv` hook: runs once Jest's globals (describe/it/
// beforeEach) exist, registering hooks that apply to every test file.
//
// Every test in the suite shares one real Postgres database (see
// globalSetup.ts), so `beforeEach` truncates all tables before each test to
// give it a clean slate. This is also *why* `npm test` runs Jest with
// `--runInBand`: if test files ran in parallel worker processes, their
// TRUNCATEs would race against each other's still-running queries.
import { closePool, pool } from '../../src/config/db';

beforeEach(async () => {
  await pool.query('TRUNCATE registrations, tournaments, users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await closePool();
});
