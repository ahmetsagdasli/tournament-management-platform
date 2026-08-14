import type { Request, Response } from 'express';

import {
  createTournament,
  deleteTournament,
  getTournament,
  listTournaments,
  updateTournament,
} from '../services/tournamentService';
import type {
  CreateTournamentInput,
  TournamentQuery,
  UpdateTournamentInput,
} from '../validators/tournamentValidators';

export async function list(req: Request, res: Response): Promise<void> {
  const tournaments = await listTournaments(req.query as TournamentQuery);
  res.status(200).json({ tournaments });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const tournament = await getTournament(req.params.id!);
  res.status(200).json({ tournament });
}

export async function create(req: Request, res: Response): Promise<void> {
  const tournament = await createTournament(req.body as CreateTournamentInput);
  res.status(201).json({ tournament });
}

export async function update(req: Request, res: Response): Promise<void> {
  const tournament = await updateTournament(
    req.params.id!,
    req.body as UpdateTournamentInput,
  );
  res.status(200).json({ tournament });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await deleteTournament(req.params.id!);
  res.status(204).send();
}
