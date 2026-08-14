import { useState, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import type { ApiError } from '../types/api';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as LocationState | null)?.from?.pathname ?? '/tournaments';

  async function submit(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
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
    <main className="page auth-page" onKeyDown={handleKeyDown}>
      <section className="panel auth-panel">
        <h1>Login</h1>
        <label>
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="AdminPass123"
          />
        </label>
        <ErrorMessage error={error} />
        <button onClick={() => void submit()} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <p>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
