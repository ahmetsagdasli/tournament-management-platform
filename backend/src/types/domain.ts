// Shared domain types used across services, controllers, and middleware.
// These mirror the shapes the API actually returns (dates as ISO strings,
// counts as real numbers) rather than raw database row types.
export type UserRole = 'USER' | 'ADMIN';
export type TournamentStatus = 'OPEN' | 'CLOSED' | 'COMPLETED';

// The decoded JWT payload attached to `req.user` by the `authenticate`
// middleware. `sub` is the user's id (standard JWT "subject" claim name).
export interface AuthenticatedUser {
  sub: string;
  role: UserRole;
}

// A user record safe to send to a client — notably, no password_hash.
export interface PublicUser {
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
  user: PublicUser;
}
