import { Link } from 'react-router-dom';

import * as api from '../api/services';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import { useApi } from '../hooks/useApi';

export function MyTournamentsPage(): JSX.Element {
  const { data, loading, error } = useApi(api.listMyRegistrations, []);

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>My Tournaments</h1>
          <span className="page-kicker">{data?.length ?? 0} registrations</span>
        </div>
      </div>
      {loading ? <LoadingState label="Loading your registrations..." /> : null}
      <ErrorMessage error={error} />

      {!loading && !error && (data ?? []).length === 0 ? (
        <EmptyState
          title="No registrations yet"
          message="Browse open tournaments and register for one to see it here."
          actionLabel="Browse tournaments"
          actionTo="/tournaments"
        />
      ) : null}

      {(data ?? []).length > 0 ? <div className="grid">
        {(data ?? []).map((registration) => (
          <article className="card" key={registration.id}>
            <div className="card-head">
              <h2>{registration.tournament.name}</h2>
              <StatusBadge status={registration.tournament.status} />
            </div>
            <div className="metric-row">
              <span>Registered</span>
              <span>{new Date(registration.created_at).toLocaleString()}</span>
            </div>
            <Link className="text-action" to={`/tournaments/${registration.tournament.id}`}>
              View details
            </Link>
          </article>
        ))}
      </div> : null}
    </main>
  );
}
