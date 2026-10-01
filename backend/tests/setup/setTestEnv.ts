// Jest `setupFiles` hook: runs before the test framework itself is loaded,
// so this is where process.env must be forced into a known test shape
// before any application module (which may read env vars at import time,
// e.g. config/env.ts) gets imported.
import dotenv from 'dotenv';

dotenv.config();

process.env.NODE_ENV = 'test';
// Lower bcrypt cost than the app default speeds up the many password
// hashes created by tests/setup/factories.ts without weakening real
// deployments (this only affects NODE_ENV=test).
process.env.BCRYPT_COST = '10';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
