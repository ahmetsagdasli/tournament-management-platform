// Augments Express's built-in Request type with an optional `user` field,
// so `req.user` is type-checked everywhere instead of needing a cast.
// Populated by the `authenticate` middleware; still `undefined` for public
// routes or before that middleware runs.
import type { AuthenticatedUser } from './domain';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
