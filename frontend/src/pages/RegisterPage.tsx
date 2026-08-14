import { useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import type { ApiError } from '../types/api';

export function RegisterPage(): JSX.Element {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      await register({ name, email, password });
      navigate('/tournaments');
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
        <h1>Register</h1>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ada Demir"
          />
        </label>
        <label>
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ada@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password123"
          />
          <small className="form-hint">Use 8-72 characters with uppercase, lowercase, and a digit.</small>
        </label>
        <ErrorMessage error={error} />
        <button onClick={() => void submit()} disabled={loading}>
          {loading ? 'Creating...' : 'Create account'}
        </button>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
