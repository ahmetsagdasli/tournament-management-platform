// Route guard used to wrap pages that require a logged-in user (and
// optionally a specific role, e.g. `requireRole="ADMIN"`). This is a UX
// convenience only — the backend independently enforces the same rules via
// the `authenticate`/`authorize` middleware, so bypassing this component
// (e.g. by editing frontend state in DevTools) cannot grant real access.
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from './AuthContext';
import type { UserRole } from '../types/api';

export function ProtectedRoute({
  children,
  requireRole,
}: {
  children: JSX.Element;
  requireRole?: UserRole;
}): JSX.Element {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for the initial "is there a valid session" check before deciding
  // anything, so a logged-in user refreshing the page is never bounced to
  // /login just because AuthContext hasn't resolved yet.
  if (loading) {
    return <main className="page">Loading...</main>;
  }

  if (!user) {
    // Remembers where the user was trying to go (`state.from`) so
    // LoginPage can send them back there after a successful login instead
    // of always landing on the default page.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireRole && user.role !== requireRole) {
    return (
      <main className="page">
        <section className="empty-state">
          <h2>Access denied</h2>
          <p>Your account does not have permission to open this page.</p>
        </section>
      </main>
    );
  }

  return children;
}
