// Builds the Express app (middleware + routes) without starting it. Kept
// separate from server.ts so tests can create an app instance with
// supertest and never actually bind a port.
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import { AppError } from './errors/AppError';
import { errorHandler } from './errors/errorHandler';
import { authRoutes } from './routes/authRoutes';
import { meRoutes } from './routes/meRoutes';
import { tournamentRoutes } from './routes/tournamentRoutes';

export function createApp(): express.Express {
  const app = express();

  // Removing the X-Powered-By header and adding Helmet's other secure
  // defaults (CSP-lite headers, no-sniff, etc.) reduces the app's
  // fingerprint for casual scanning.
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // A missing `origin` header means a non-browser client (curl,
        // server-to-server, same-origin) — always allowed. Browser
        // cross-origin requests must match the configured allowlist.
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new AppError(403, 'FORBIDDEN', 'CORS origin not allowed'));
      },
    }),
  );
  // 10kb cap on JSON bodies — generous for this API's small payloads, tight
  // enough to blunt trivial body-based DoS attempts.
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/tournaments', tournamentRoutes);

  // Reached only if no route above matched — turns an unknown path into the
  // same JSON error envelope as every other error, instead of Express's
  // default HTML 404 page.
  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });

  // Must be registered last: Express recognizes error-handling middleware
  // by its four-argument signature (err, req, res, next) and only invokes
  // it when something upstream calls next(error) or throws.
  app.use(errorHandler);

  return app;
}
