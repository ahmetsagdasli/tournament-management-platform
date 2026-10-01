// Thin, typed wrappers around every backend endpoint the frontend calls.
// Each function unwraps the response envelope (e.g. `{ tournament }` ->
// `Tournament`) so pages/hooks work with plain domain objects instead of
// axios response objects.
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

// Fetches the current user for the token already attached by the request
// interceptor. Used by AuthContext on app load to check whether a stored
// token is still valid.
export async function getMe(): Promise<User> {
  const response = await apiClient.get<{ user: User }>('/api/auth/me');
  return response.data.user;
}

// `status` is optional — omitting it returns tournaments in every status,
// matching the backend's `tournamentQuerySchema`.
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

// The backend returns 204 No Content on success, so there is no body to
// unwrap here — a rejected promise (via the response interceptor) is how
// callers find out about the 409 HAS_REGISTRATIONS case.
export async function deleteTournament(id: string): Promise<void> {
  await apiClient.delete(`/api/tournaments/${id}`);
}

// No request body is needed — the backend takes the registering user from
// the JWT, not from anything the client sends (see registrationController).
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
