// Process entry point (`npm run dev` / `npm start`). Wires the Express app
// from app.ts to an actual HTTP server and handles graceful shutdown.
import { createServer } from 'http';

import { createApp } from './app';
import { closePool } from './config/db';
import { env } from './config/env';

const server = createServer(createApp());

server.listen(env.port, () => {
  console.log(`API listening on port ${env.port}`);
});

// On SIGINT/SIGTERM (Ctrl+C, `docker stop`, process managers, etc.), stop
// accepting new connections, close the DB pool, then exit — rather than
// dying mid-request or leaving Postgres connections dangling.
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
