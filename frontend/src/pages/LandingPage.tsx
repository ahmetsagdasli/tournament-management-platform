import { Link, useNavigate } from 'react-router-dom';
import { useState, type KeyboardEvent } from 'react';

import * as api from '../api/services';
import { useAuth } from '../auth/AuthContext';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import { useApi } from '../hooks/useApi';

export function LandingPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const { data: tournaments, loading, error } = useApi(api.listTournaments, []);
  const normalizedSearch = search.trim().toLowerCase();
  const featured = (tournaments ?? [])
    .filter((tournament) => {
      if (!normalizedSearch) {
        return true;
      }

      return [tournament.name, tournament.description, tournament.status]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .slice(0, 3);

  function submitSearch(): void {
    const query = search.trim();
    navigate(query ? `/tournaments?search=${encodeURIComponent(query)}` : '/tournaments');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      submitSearch();
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <span className="hero-kicker">Tournament operations, simplified</span>
          <h1>Tournament Platform</h1>
          <p>
            Manage events, registrations, capacity, and player lists from one focused workspace.
          </p>
          <div className="hero-search">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tournaments"
            />
            <button onClick={submitSearch}>Search</button>
          </div>
          <div className="hero-actions">
            <Link className="button-link" to="/tournaments">
              Browse tournaments
            </Link>
            {user ? (
              <Link className="button-link secondary-link" to="/my-tournaments">
                My tournaments
              </Link>
            ) : (
              <Link className="button-link secondary-link" to="/register">
                Create account
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="page landing-section">
        <div className="page-header">
          <div>
            <h2>Featured Tournaments</h2>
            <span className="page-kicker">{featured.length} visible</span>
          </div>
          <Link className="text-action" to="/tournaments">
            View all
          </Link>
        </div>

        {loading ? <LoadingState label="Loading featured tournaments..." /> : null}
        <ErrorMessage error={error} />

        {!loading && !error && featured.length === 0 ? (
          <EmptyState
            title="No featured tournaments found"
            message="Try a different search term or browse the full tournament list."
            actionLabel="Browse all"
            actionTo="/tournaments"
          />
        ) : null}

        {featured.length > 0 ? <div className="grid">
          {featured.map((tournament) => (
            <article className="card" key={tournament.id}>
              <div className="card-head">
                <h2>{tournament.name}</h2>
                <StatusBadge status={tournament.status} />
              </div>
              <p>{tournament.description}</p>
              <div className="metric-row">
                <span>{tournament.registered_count}/{tournament.max_players} players</span>
                <span>{new Date(tournament.starts_at).toLocaleDateString()}</span>
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
      </section>
    </main>
  );
}
