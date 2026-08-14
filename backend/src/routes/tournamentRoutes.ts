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

export const tournamentRoutes = Router();

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
