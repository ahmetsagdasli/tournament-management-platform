import { z } from 'zod';

const statusSchema = z.enum(['OPEN', 'CLOSED', 'COMPLETED']);

export const tournamentQuerySchema = z.object({
  status: statusSchema.optional(),
});

// status is not a field here: new tournaments always start OPEN.
export const createTournamentSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    max_players: z.coerce.number().int().positive(),
    starts_at: z.coerce.date().refine((date) => date.getTime() > Date.now(), {
      message: 'starts_at must be in the future',
    }),
  })
  .strict();

// All fields optional (PATCH semantics). Which status transitions are
// actually legal is enforced in tournamentService.updateTournament.
export const updateTournamentSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    max_players: z.coerce.number().int().positive().optional(),
    starts_at: z.coerce.date().optional(),
    status: statusSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type TournamentQuery = z.infer<typeof tournamentQuerySchema>;
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;
