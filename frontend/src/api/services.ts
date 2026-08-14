import { apiClient } from './client';
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  Registration,
  RegistrationWithTournament,
  RegistrationWithUser,
  Tournament,
  TournamentInput,
  TournamentStatus,
  TournamentUpdateInput,
  User,
} from '../types/api';

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/api/auth/register', input);
  return response.data;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/api/auth/login', input);
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await apiClient.get<{ user: User }>('/api/auth/me');
  return response.data.user;
}

export async function listTournaments(status?: TournamentStatus): Promise<Tournament[]> {
  const response = await apiClient.get<{ tournaments: Tournament[] }>('/api/tournaments', {
    params: status ? { status } : undefined,
  });
  return response.data.tournaments;
}

export async function getTournament(id: string): Promise<Tournament> {
  const response = await apiClient.get<{ tournament: Tournament }>(`/api/tournaments/${id}`);
  return response.data.tournament;
}

export async function createTournament(input: TournamentInput): Promise<Tournament> {
  const response = await apiClient.post<{ tournament: Tournament }>('/api/tournaments', input);
  return response.data.tournament;
}

export async function updateTournament(
  id: string,
  input: TournamentUpdateInput,
): Promise<Tournament> {
  const response = await apiClient.patch<{ tournament: Tournament }>(
    `/api/tournaments/${id}`,
    input,
  );
  return response.data.tournament;
}

export async function deleteTournament(id: string): Promise<void> {
  await apiClient.delete(`/api/tournaments/${id}`);
}

export async function registerForTournament(id: string): Promise<Registration> {
  const response = await apiClient.post<{ registration: Registration }>(
    `/api/tournaments/${id}/register`,
    {},
  );
  return response.data.registration;
}

export async function listMyRegistrations(): Promise<RegistrationWithTournament[]> {
  const response = await apiClient.get<{ registrations: RegistrationWithTournament[] }>(
    '/api/me/registrations',
  );
  return response.data.registrations;
}

export async function listTournamentRegistrations(
  id: string,
): Promise<RegistrationWithUser[]> {
  const response = await apiClient.get<{ registrations: RegistrationWithUser[] }>(
    `/api/tournaments/${id}/registrations`,
  );
  return response.data.registrations;
}
