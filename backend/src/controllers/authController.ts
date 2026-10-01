import type { Request, Response } from 'express';

import { getCurrentUser, loginUser, registerUser } from '../services/authService';
import type { LoginInput, RegisterInput } from '../validators/authValidators';

export async function register(req: Request, res: Response): Promise<void> {
  const result = await registerUser(req.body as RegisterInput);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await loginUser(req.body as LoginInput);
  res.status(200).json(result);
}

// req.user! is safe: this route sits behind the authenticate middleware.
export async function me(req: Request, res: Response): Promise<void> {
  const user = await getCurrentUser(req.user!.sub);
  res.status(200).json({ user });
}
