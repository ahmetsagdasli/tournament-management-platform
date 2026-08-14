import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError } from './AppError';

type PgError = Error & {
  code?: string;
  constraint?: string;
};

function isPgError(error: unknown): error is PgError {
  return error instanceof Error && typeof (error as PgError).code === 'string';
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.issues,
      },
    });
    return;
  }

  if (isPgError(error)) {
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      res.status(409).json({
        error: { code: 'EMAIL_TAKEN', message: 'Email is already taken', details: [] },
      });
      return;
    }

    if (error.code === '23505' && error.constraint === 'registrations_user_tournament_unique') {
      res.status(409).json({
        error: { code: 'ALREADY_REGISTERED', message: 'Already registered', details: [] },
      });
      return;
    }

    if (error.code === '23503') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Resource not found', details: [] },
      });
      return;
    }
  }

  console.error('Unexpected error', error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: [],
    },
  });
};
