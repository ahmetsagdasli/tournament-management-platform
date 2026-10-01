import jwt from 'jsonwebtoken';

import { env } from './env';
import type { AuthenticatedUser, UserRole } from '../types/domain';

interface JwtPayload {
  sub: string;
  role: UserRole;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '2h' });
}

export function verifyAccessToken(token: string): AuthenticatedUser {
  const decoded = jwt.verify(token, env.jwtSecret);

  // Narrow jwt.verify's loose return type to our known payload shape.
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof decoded.sub !== 'string' ||
    (decoded.role !== 'USER' && decoded.role !== 'ADMIN')
  ) {
    throw new Error('Invalid token payload');
  }

  return {
    sub: decoded.sub,
    role: decoded.role,
  };
}
