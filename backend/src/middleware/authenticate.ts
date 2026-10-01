// Requires a valid `Authorization: Bearer <token>` header and attaches the
// decoded user to req.user.
import type { RequestHandler } from 'express';

import { verifyAccessToken } from '../config/jwt';
import { AppError } from '../errors/AppError';

export const authenticate: RequestHandler = (req, _res, next) => {
  const authorization = req.header('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  const token = authorization.slice('Bearer '.length);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
};
