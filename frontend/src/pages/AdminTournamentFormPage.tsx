import { useEffect, useState, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import * as api from '../api/services';
import { ErrorMessage } from '../components/ErrorMessage';
import type { ApiError, TournamentStatus } from '../types/api';

const statuses: TournamentStatus[] = ['OPEN', 'CLOSED', 'COMPLETED'];

export function AdminTournamentFormPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [startsAt, setStartsAt] = useState('');
  const [status, setStatus] = useState<TournamentStatus>('OPEN');
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTournament(): Promise<void> {
      if (!id) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const tournament = await api.getTournament(id);

        if (!cancelled) {
          setName(tournament.name);
          setDescription(tournament.description);
          setMaxPlayers(tournament.max_players);
          setStartsAt(toDateTimeLocal(tournament.starts_at));
          setStatus(tournament.status);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError as ApiError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTournament();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function submit(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const input = {
        name,
        description,
        max_players: maxPlayers,
        starts_at: new Date(startsAt).toISOString(),
      };

      const tournament = editing
        ? await api.updateTournament(id!, { ...input, status })
        : await api.createTournament(input);

      navigate(`/tournaments/${tournament.id}`);
    } catch (caughtError) {
      setError(caughtError as ApiError);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      void submit();
    }
  }

  return (
    <main className="page" onKeyDown={handleKeyDown}>
      <section className="panel form-panel">
        <div className="page-header">
          <div>
            <h1>{editing ? 'Edit Tournament' : 'Create Tournament'}</h1>
            <span className="page-kicker">{editing ? 'Admin update' : 'Admin create'}</span>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Istanbul Chess Open"
            />
          </label>
          <label>
            Max players
            <input
              type="number"
              min="1"
              value={maxPlayers}
              onChange={(event) => setMaxPlayers(Number(event.target.value))}
            />
            <small className="form-hint">Must stay above the current registration count.</small>
          </label>
          <label className="span-2">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short summary players will see before registering."
            />
          </label>
          <label>
            Starts at
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
            <small className="form-hint">Create requires a future date; edits may keep past dates.</small>
          </label>
          {editing ? (
            <label>
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as TournamentStatus)}
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <small className="form-hint">Allowed flow: OPEN to CLOSED to COMPLETED.</small>
            </label>
          ) : null}
        </div>

        <ErrorMessage error={error} />
        <div className="action-row">
          <button onClick={() => void submit()} disabled={loading || !startsAt}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </section>
    </main>
  );
}

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
