import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import * as api from '../api/services';
import { useAuth } from '../auth/AuthContext';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import { useApi } from '../hooks/useApi';
import type { TournamentStatus } from '../types/api';

const statuses: Array<TournamentStatus | undefined> = [undefined, 'OPEN', 'CLOSED', 'COMPLETED'];

export function TournamentListPage(): JSX.Element {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';
  const [status, setStatus] = useState<TournamentStatus | undefined>();
  const [search, setSearch] = useState(urlSearch);
  const { data: tournaments, loading, error } = useApi(
    () => api.listTournaments(status),
    [status],
  );
  const normalizedSearch = search.trim().toLowerCase();
  const visibleTournaments = (tournaments ?? []).filter((tournament) => {
    if (!normalizedSearch) {
      return true;
    }

    return [tournament.name, tournament.description, tournament.status]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch);
  });

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  function updateSearch(value: string): void {
    setSearch(value);

    if (value.trim()) {
      setSearchParams({ search: value.trim() }, { replace: true });
      return;
    }

    setSearchParams({}, { replace: true });
  }

  function clearFilters(): void {
    setStatus(undefined);
    updateSearch('');
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Tournaments</h1>
          <span className="page-kicker">{visibleTournaments.length} listed</span>
        </div>
        {user?.role === 'ADMIN' ? (
          <Link className="button-link" to="/admin/tournaments/new">
            Create
          </Link>
        ) : null}
      </div>

      <div className="list-controls">
        <div className="search-box">
          <input
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search by name, description, or status"
          />
          {search ? (
            <button className="button-secondary" onClick={() => updateSearch('')}>
              Clear
            </button>
          ) : null}
        </div>
        <div className="segmented">
          {statuses.map((item) => (
            <button
              key={item ?? 'ALL'}
              className={status === item ? 'active' : ''}
              onClick={() => setStatus(item)}
            >
              {item ?? 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingState label="Loading tournaments..." /> : null}
      <ErrorMessage error={error} />

      {!loading && !error && visibleTournaments.length === 0 ? (
        <EmptyState
          title="No tournaments found"
          message="Adjust the search or status filter to find a matching tournament."
          actionLabel="Clear filters"
          actionOnClick={clearFilters}
        />
      ) : null}

      {visibleTournaments.length > 0 ? <div className="grid">
        {visibleTournaments.map((tournament) => (
          <article className="card" key={tournament.id}>
            <div className="card-head">
              <h2>{tournament.name}</h2>
              <StatusBadge status={tournament.status} />
            </div>
            <p>{tournament.description}</p>
            <div className="metric-row">
              <span>{tournament.registered_count}/{tournament.max_players} players</span>
              <span>{new Date(tournament.starts_at).toLocaleString()}</span>
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
            <Link className="text-action" to={`/tournaments/${tournament.id}`}>
              View details
            </Link>
          </article>
        ))}
      </div> : null}
    </main>
  );
}
