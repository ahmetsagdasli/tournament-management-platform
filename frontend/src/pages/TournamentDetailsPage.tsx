import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import * as api from '../api/services';
import { useAuth } from '../auth/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import { useApi } from '../hooks/useApi';
import type { ApiError, RegistrationWithUser } from '../types/api';

export function TournamentDetailsPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [registeredTournamentIds, setRegisteredTournamentIds] = useState<Set<string>>(new Set());
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { data: tournament, loading, error, refetch } = useApi(
    () => api.getTournament(id!),
    [id],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRegistrations(): Promise<void> {
      if (!user) {
        setRegisteredTournamentIds(new Set());
        setRegistrationLoading(false);
        return;
      }

      setRegistrationLoading(true);

      try {
        const registrations = await api.listMyRegistrations();

        if (!cancelled) {
          setRegisteredTournamentIds(
            new Set(registrations.map((registration) => registration.tournament_id)),
          );
        }
      } catch {
        if (!cancelled) {
          setRegisteredTournamentIds(new Set());
        }
      } finally {
        if (!cancelled) {
          setRegistrationLoading(false);
        }
      }
    }

    void loadRegistrations();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function register(): Promise<void> {
    setActionError(null);
    setActionMessage('');
    setActionLoading(true);

    try {
      await api.registerForTournament(id!);
      setActionMessage('Registered successfully');
      setRegisteredTournamentIds((current) => new Set([...current, id!]));
      await refetch();
    } catch (caughtError) {
      const apiError = caughtError as ApiError;

      if (apiError.code === 'ALREADY_REGISTERED') {
        setRegisteredTournamentIds((current) => new Set([...current, id!]));
      }

      setActionError(apiError);
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteTournament(): Promise<void> {
    if (!window.confirm('Delete this tournament? This cannot be undone.')) {
      return;
    }

    setActionError(null);
    setDeleteLoading(true);

    try {
      await api.deleteTournament(id!);
      navigate('/tournaments');
    } catch (caughtError) {
      setActionError(caughtError as ApiError);
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <LoadingState label="Loading tournament..." />
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="page">
        <ErrorMessage error={error} />
      </main>
    );
  }

  const isFull = tournament.registered_count >= tournament.max_players;
  const isRegistered = registeredTournamentIds.has(tournament.id);
  const registrationDisabled =
    registrationLoading || actionLoading || tournament.status !== 'OPEN' || isFull || isRegistered;
  const registerLabel = getRegisterLabel({
    actionLoading,
    isFull,
    isRegistered,
    registrationLoading,
    status: tournament.status,
  });

  return (
    <main className="page">
      <section className="panel detail-panel">
        <div className="page-header">
          <div>
            <h1>{tournament.name}</h1>
            <span className="page-kicker">{new Date(tournament.starts_at).toLocaleString()}</span>
          </div>
          <StatusBadge status={tournament.status} />
        </div>
        <p className="description">{tournament.description}</p>

        <div className="stats">
          <div>
            <strong>{tournament.registered_count}</strong>
            <span>Registered</span>
          </div>
          <div>
            <strong>{tournament.max_players}</strong>
            <span>Capacity</span>
          </div>
          <div>
            <strong>{Math.max(0, tournament.max_players - tournament.registered_count)}</strong>
            <span>Remaining</span>
          </div>
        </div>

        <div className="capacity-track">
          <span
            style={{
              width: `${Math.min(
                100,
                (tournament.registered_count / tournament.max_players) * 100,
              )}%`,
            }}
          />
        </div>

        <div className="action-row">
          {user ? (
            <button
              onClick={() => void register()}
              disabled={registrationDisabled}
            >
              {registerLabel}
            </button>
          ) : (
            <Link className="button-link" to="/login">
              Login to register
            </Link>
          )}

          {user?.role === 'ADMIN' ? (
            <Link className="button-link secondary-link" to={`/admin/tournaments/${tournament.id}/edit`}>
              Edit tournament
            </Link>
          ) : null}
          {user?.role === 'ADMIN' && tournament.registered_count === 0 ? (
            <button
              className="button-secondary"
              onClick={() => void deleteTournament()}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete tournament'}
            </button>
          ) : null}
        </div>

        {user && tournament.status === 'OPEN' && isFull ? (
          <small className="form-hint">This tournament is at capacity.</small>
        ) : null}
        {user && tournament.status !== 'OPEN' ? (
          <small className="form-hint">Registration is only available for OPEN tournaments.</small>
        ) : null}

        {actionMessage ? <div className="notice success">{actionMessage}</div> : null}
        <ErrorMessage error={actionError} />
      </section>

      {user?.role === 'ADMIN' ? <AdminRegistrations tournamentId={tournament.id} /> : null}
    </main>
  );
}

function getRegisterLabel({
  actionLoading,
  isFull,
  isRegistered,
  registrationLoading,
  status,
}: {
  actionLoading: boolean;
  isFull: boolean;
  isRegistered: boolean;
  registrationLoading: boolean;
  status: string;
}): string {
  if (registrationLoading) {
    return 'Checking...';
  }

  if (actionLoading) {
    return 'Registering...';
  }

  if (isRegistered) {
    return 'Registered';
  }

  if (status !== 'OPEN') {
    return 'Registration closed';
  }

  if (isFull) {
    return 'Full';
  }

  return 'Register';
}

function AdminRegistrations({ tournamentId }: { tournamentId: string }): JSX.Element {
  const { data, loading, error } = useApi<RegistrationWithUser[]>(
    () => api.listTournamentRegistrations(tournamentId),
    [tournamentId],
  );

  return (
    <section className="panel table-panel">
      <h2>Registered players</h2>
      {loading ? <LoadingState label="Loading registered players..." /> : null}
      <ErrorMessage error={error} />
      {!loading && !error && (data ?? []).length === 0 ? (
        <section className="empty-state compact-empty">
          <h2>No players yet</h2>
          <p>Registered players will appear here after users join this tournament.</p>
        </section>
      ) : null}
      {(data ?? []).length > 0 ? <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((registration) => (
              <tr key={registration.id}>
                <td>{registration.user.name}</td>
                <td>{registration.user.email}</td>
                <td>{new Date(registration.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> : null}
    </section>
  );
}
