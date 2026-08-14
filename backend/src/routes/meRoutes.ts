import { Router } from 'express';

import { mine } from '../controllers/registrationController';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/authenticate';

export const meRoutes = Router();

meRoutes.get('/registrations', authenticate, asyncHandler(mine));
