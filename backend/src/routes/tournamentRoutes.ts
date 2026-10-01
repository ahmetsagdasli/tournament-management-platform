import { Router } from 'express';

import {
  byTournament,
  register as registerForTournament,
} from '../controllers/registrationController';
import { create, getById, list, remove, update } from '../controllers/tournamentController';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { idParamsSchema } from '../validators/sharedValidators';
import {
  createTournamentSchema,
  tournamentQuerySchema,
  updateTournamentSchema,
} from '../validators/tournamentValidators';

// Mounted at /api/tournaments in app.ts. Every protected route composes the
// same pieces in the same order: authenticate -> authorize -> validate ->
// asyncHandler(controller), matching the layering described in the README.
// The two public GET routes below skip authenticate/authorize entirely.
export const tournamentRoutes = Router();

// Browsing tournaments (list, single, and joining one) is public or only
// requires being logged in — no ADMIN check on these three.
tournamentRoutes.get('/', validate(tournamentQuerySchema, 'query'), asyncHandler(list));
tournamentRoutes.get('/:id', validate(idParamsSchema, 'params'), asyncHandler(getById));
tournamentRoutes.get(
  '/:id/registrations',
  authenticate,
  authorize('ADMIN'),
  validate(idParamsSchema, 'params'),
  asyncHandler(byTournament),
);
tournamentRoutes.post(
  '/:id/register',
  authenticate,
  validate(idParamsSchema, 'params'),
  asyncHandler(registerForTournament),
);
// Everything below manages tournaments themselves and is ADMIN-only.
tournamentRoutes.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createTournamentSchema, 'body'),
  asyncHandler(create),
);
tournamentRoutes.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(idParamsSchema, 'params'),
  validate(updateTournamentSchema, 'body'),
  asyncHandler(update),
);
tournamentRoutes.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(idParamsSchema, 'params'),
  asyncHandler(remove),
);
