import type { RequestHandler } from 'express';

import { AppError } from '../errors/AppError';
import type { UserRole } from '../types/domain';

export function authorize(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError(403, 'FORBIDDEN', 'Forbidden'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Forbidden'));
      return;
    }

    next();
  };
}
