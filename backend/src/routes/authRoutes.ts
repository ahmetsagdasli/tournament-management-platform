import { Router } from 'express';

import { login, me, register } from '../controllers/authController';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validators/authValidators';

export const authRoutes = Router();

authRoutes.post('/register', validate(registerSchema, 'body'), asyncHandler(register));
authRoutes.post('/login', validate(loginSchema, 'body'), asyncHandler(login));
authRoutes.get('/me', authenticate, asyncHandler(me));
