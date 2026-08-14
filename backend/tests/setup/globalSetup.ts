import { spawnSync } from 'child_process';
import dotenv from 'dotenv';

export default async function globalSetup(): Promise<void> {
  dotenv.config();

  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL is required');
  }

  const databaseName = new URL(testDatabaseUrl).pathname.slice(1);

  if (!databaseName.endsWith('_test')) {
    throw new Error(`Refusing to run tests against non-test database: ${databaseName}`);
  }

  const result = spawnSync('npm', ['run', 'migrate', '--', 'up'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      BCRYPT_COST: '10',
    },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error('Test database migrations failed');
  }
}
