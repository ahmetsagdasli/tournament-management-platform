import { createServer } from 'http';

import { createApp } from './app';
import { closePool } from './config/db';
import { env } from './config/env';

const server = createServer(createApp());

server.listen(env.port, () => {
  console.log(`API listening on port ${env.port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down`);

  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
