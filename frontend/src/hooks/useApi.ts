// Generic "fetch on mount / on dependency change, expose loading & error"
// hook that every page uses instead of hand-rolling its own useEffect +
// three useState calls. `request` should be a stable-enough function (e.g.
// `() => api.getTournament(id)`) and `dependencies` should include whatever
// that closure captures (e.g. `[id]`), the same rules as useEffect's own
// dependency array.
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

import type { ApiError } from '../types/api';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  // Re-runs the same request on demand, e.g. after a mutation elsewhere on
  // the page needs the list to reflect the change.
  refetch: () => Promise<void>;
}

export function useApi<T>(
  request: () => Promise<T>,
  dependencies: DependencyList = [],
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  // Tracks whether the component is still mounted, so a slow response that
  // resolves after unmount does not call setState on an unmounted
  // component and overwrite state nothing is reading anymore.
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await request();

      if (mountedRef.current) {
        setData(result);
      }
    } catch (caughtError) {
      if (mountedRef.current) {
        setError(caughtError as ApiError);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, dependencies);

  // The automatic fetch-on-mount-or-dependency-change effect. This is
  // intentionally separate from `refetch` above (rather than just calling
  // `refetch()` here) so it can use its own `cancelled` flag scoped to this
  // specific effect run: if `dependencies` change again before the current
  // request resolves (e.g. the user navigates to a different tournament id
  // quickly), the stale response is discarded instead of overwriting
  // fresher data.
  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const result = await request();

        if (!cancelled) {
          setData(result);
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

    void run();

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return { data, loading, error, refetch };
}
