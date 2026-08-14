import type { Request, Response } from 'express';

import {
  listMyRegistrations,
  listTournamentRegistrations,
  registerForTournament,
} from '../services/registrationService';

export async function register(req: Request, res: Response): Promise<void> {
  const registration = await registerForTournament(req.user!.sub, req.params.id!);
  res.status(201).json({ registration });
}

export async function mine(req: Request, res: Response): Promise<void> {
  const registrations = await listMyRegistrations(req.user!.sub);
  res.status(200).json({ registrations });
}

export async function byTournament(req: Request, res: Response): Promise<void> {
  const registrations = await listTournamentRegistrations(req.params.id!);
  res.status(200).json({ registrations });
}
