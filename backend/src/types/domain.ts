export type UserRole = 'USER' | 'ADMIN';
export type TournamentStatus = 'OPEN' | 'CLOSED' | 'COMPLETED';

export interface AuthenticatedUser {
  sub: string;
  role: UserRole;
}

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
