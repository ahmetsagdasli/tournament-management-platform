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

  if (loading) {
    return <main className="page">Loading...</main>;
  }

  if (!user) {
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
