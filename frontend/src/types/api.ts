// Mirrors the backend's response shapes (see backend/src/types/domain.ts
// and the validators) so the frontend has compile-time checked types for
// every API response and request body it works with.
export type UserRole = 'USER' | 'ADMIN';
export type TournamentStatus = 'OPEN' | 'CLOSED' | 'COMPLETED';

// The normalized shape every rejected API call produces, after
// api/client.ts's response interceptor runs. `code` is intentionally a
// plain `string` (not a union) here — the frontend only switches on a
// handful of specific codes (see ErrorMessage, TournamentDetailsPage) and
// otherwise just displays `message` as-is.
export interface ApiError {
  code: string;
  message: string;
  details: unknown[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  max_players: number;
  starts_at: string;
  status: TournamentStatus;
  created_at: string;
  registered_count: number;
}

export interface Registration {
  id: string;
  user_id: string;
  tournament_id: string;
  created_at: string;
}

export interface RegistrationWithTournament extends Registration {
  tournament: Tournament;
}

export interface RegistrationWithUser extends Registration {
  user: User;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TournamentInput {
  name: string;
  description: string;
  max_players: number;
  starts_at: string;
}

export interface TournamentUpdateInput {
  name?: string;
  description?: string;
  max_players?: number;
  starts_at?: string;
  status?: TournamentStatus;
}
