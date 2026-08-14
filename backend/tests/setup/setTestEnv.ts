import dotenv from 'dotenv';

dotenv.config();

process.env.NODE_ENV = 'test';
process.env.BCRYPT_COST = '10';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
