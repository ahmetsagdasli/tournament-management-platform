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

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new AppError(403, 'FORBIDDEN', 'CORS origin not allowed'));
      },
    }),
  );
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/tournaments', tournamentRoutes);

  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });

  app.use(errorHandler);

  return app;
}
