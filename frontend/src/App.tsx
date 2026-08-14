import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';

import { useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminTournamentFormPage } from './pages/AdminTournamentFormPage';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { MyTournamentsPage } from './pages/MyTournamentsPage';
import { RegisterPage } from './pages/RegisterPage';
import { TournamentDetailsPage } from './pages/TournamentDetailsPage';
import { TournamentListPage } from './pages/TournamentListPage';

export function App(): JSX.Element {
  const { user, logout, loading: authLoading } = useAuth();
  const location = useLocation();
  const showSidebar = !['/', '/login', '/register'].includes(location.pathname);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">TP</span>
            <span>Tournament Platform</span>
          </Link>
          <nav>
            <NavLink className="nav-link" to="/" end>
              Home
            </NavLink>
            <NavLink className="nav-link" to="/tournaments">
              Tournaments
            </NavLink>
            {!authLoading && user ? (
              <NavLink className="nav-link" to="/my-tournaments">
                My Tournaments
              </NavLink>
            ) : null}
            {!authLoading && user?.role === 'ADMIN' ? (
              <NavLink className="nav-link" to="/admin/tournaments/new">
                Admin
              </NavLink>
            ) : null}
            {authLoading ? null : user ? (
              <>
                <span className="user-chip">{user.role}</span>
                <button className="button-secondary" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink className="nav-link" to="/login">
                  Login
                </NavLink>
                <Link className="button-link" to="/register">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className={showSidebar ? 'app-shell' : undefined}>
        {showSidebar ? (
          <aside className="sidebar">
            <NavLink to="/tournaments">Browse</NavLink>
            {!authLoading && user ? <NavLink to="/my-tournaments">My Tournaments</NavLink> : null}
            {!authLoading && user?.role === 'ADMIN' ? (
              <NavLink to="/admin/tournaments/new">Create Tournament</NavLink>
            ) : null}
            {!authLoading && !user ? (
              <div className="sidebar-cta">
                <strong>Track your events</strong>
                <span>Login to register and view your tournament list.</span>
                <Link className="button-link secondary-link" to="/login">
                  Login
                </Link>
              </div>
            ) : null}
          </aside>
        ) : null}

        <div className="content-area">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/tournaments" element={<TournamentListPage />} />
            <Route path="/tournaments/:id" element={<TournamentDetailsPage />} />
            <Route
              path="/my-tournaments"
              element={
                <ProtectedRoute>
                  <MyTournamentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tournaments/new"
              element={
                <ProtectedRoute requireRole="ADMIN">
                  <AdminTournamentFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tournaments/:id/edit"
              element={
                <ProtectedRoute requireRole="ADMIN">
                  <AdminTournamentFormPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>

      <footer className="site-footer">
        <div className="footer-main">
          <Link className="footer-logo" to="/">
            <span className="brand-mark">TP</span>
            <span>Tournament Platform</span>
          </Link>
          <p>
            Browse events, reserve your spot, and manage tournament registrations
            from a focused operations workspace.
          </p>
        </div>

        <div className="footer-links">
          <Link to="/tournaments">Browse tournaments</Link>
          {!authLoading && user ? <Link to="/my-tournaments">My registrations</Link> : null}
          {!authLoading && !user ? <Link to="/login">Login</Link> : null}
          {!authLoading && user?.role === 'ADMIN' ? (
            <Link to="/admin/tournaments/new">Create tournament</Link>
          ) : null}
          {!authLoading && !user ? <Link to="/register">Create account</Link> : null}
        </div>

        <div className="footer-meta">
          <span>© 2026 Tournament Platform</span>
          <span>Registration status updates in real time after each action</span>
          <span>Support: support@tournamentplatform.dev</span>
        </div>
      </footer>
    </>
  );
}
