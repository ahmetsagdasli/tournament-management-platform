import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// App-wide auth state: who is logged in (if anyone), plus login/register/
// logout actions. The JWT itself lives in localStorage (see api/client.ts),
// not in this state — `user` is just what the UI renders based on it.
import { onUnauthorized, TOKEN_STORAGE_KEY } from '../api/client';
import * as api from '../api/services';
import type { LoginInput, RegisterInput, User } from '../types/api';

interface AuthContextValue {
  user: User | null;
  // True only while the initial "is there a valid stored token" check is
  // in flight. Consumers (App.tsx's nav, ProtectedRoute) use this to avoid
  // flashing a logged-out UI before that check resolves.
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, if a token was left over from a previous session, validate it
  // against the backend (rather than trusting it blindly) and hydrate
  // `user` from the response. An invalid/expired token is cleared silently
  // instead of showing an error, since "please log in" is the expected
  // state for an expired session, not a failure to report.
  useEffect(() => {
    let cancelled = false;

    async function loadUser(): Promise<void> {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await api.getMe();

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);

        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  // Keeps `user` in sync if the token becomes invalid *during* the session
  // (e.g. it expires while the tab is open, or the backend otherwise
  // rejects it) rather than only checking once on mount. Without this, the
  // UI would keep showing the user as logged in — Logout button, role chip,
  // admin links — while every subsequent request silently fails, until the
  // page happens to be reloaded.
  useEffect(() => onUnauthorized(() => setUser(null)), []);

  const login = useCallback(async (input: LoginInput) => {
    const result = await api.login(input);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await api.register(input);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Access point for the context. Throws instead of returning a possibly-null
// value so a page cannot forget the AuthProvider wrapper and silently get
// `undefined` behavior — the error surfaces immediately, at the call site.
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
