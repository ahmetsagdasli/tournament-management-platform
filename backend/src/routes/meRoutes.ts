import { Router } from 'express';

import { mine } from '../controllers/registrationController';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/authenticate';

// Mounted at /api/me in app.ts. Kept as its own router (rather than folded
// into tournamentRoutes) since "my registrations" is about the caller, not
// about a specific tournament.
export const meRoutes = Router();

meRoutes.get('/registrations', authenticate, asyncHandler(mine));
