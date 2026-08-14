/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup/setTestEnv.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/setupAfterEnv.ts'],
  globalSetup: '<rootDir>/tests/setup/globalSetup.ts',
};
