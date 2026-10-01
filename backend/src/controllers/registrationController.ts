import type { Request, Response } from 'express';

import {
  listMyRegistrations,
  listTournamentRegistrations,
  registerForTournament,
} from '../services/registrationService';

// Note there is no `user_id` read from req.body here — the registering
// user is always `req.user!.sub` (from the verified JWT), so a client can
// never register someone else by passing a different id in the request.
export async function register(req: Request, res: Response): Promise<void> {
  const registration = await registerForTournament(req.user!.sub, req.params.id!);
  res.status(201).json({ registration });
}

export async function mine(req: Request, res: Response): Promise<void> {
  const registrations = await listMyRegistrations(req.user!.sub);
  res.status(200).json({ registrations });
}

// ADMIN-only (enforced by the `authorize('ADMIN')` middleware on this
// route) — returns everyone registered for one tournament.
export async function byTournament(req: Request, res: Response): Promise<void> {
  const registrations = await listTournamentRegistrations(req.params.id!);
  res.status(200).json({ registrations });
}
