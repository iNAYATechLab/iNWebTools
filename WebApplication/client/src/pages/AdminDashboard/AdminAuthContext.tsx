import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as adminApi from '../../services/adminApi';
import type { AdminUser } from '../../types/admin';

type AuthState = {
  user: AdminUser | null;
  /** True until the stored token has been validated against the server. */
  loading: boolean;
  error: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Re-read the session from the server. The public auth pages store tokens
   * themselves, so they call this to pull the new user into shared state
   * instead of duplicating the sign-in path.
   */
  refresh: () => Promise<void>;
  /**
   * Adopt an account the caller has *already* authenticated.
   *
   * The sign-in and sign-up endpoints return the user alongside the tokens, so
   * the session is fully known without a second round trip. `refresh()` used
   * to be the only way to hand that user to the context, which made a
   * confirmed sign-in depend on a follow-up GET /me succeeding: if that call
   * 403'd, was aborted, or simply lost the race with the redirect, the context
   * still held `null`, the route guard saw "not signed in", and it bounced the
   * user back to /login with no error shown — the server logging a perfectly
   * good login_success the whole time.
   */
  adopt: (user: AdminUser) => void;
};

// eslint-disable-next-line react-refresh/only-export-components -- context object, not a component
export const AdminAuthContext = createContext<AuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A token in localStorage is only a claim. Verify it with the server before
  // rendering the dashboard, so a revoked account cannot linger in the UI.
  useEffect(() => {
    const controller = new AbortController();

    if (!adminApi.tokenStore.access) {
      setLoading(false);
      return () => controller.abort();
    }

    adminApi
      .getMe(controller.signal)
      .then((me) => {
        setUser(me);
        setLoading(false);
      })
      .catch((err: unknown) => {
        // Ignore our own cleanup. React's StrictMode mounts effects twice in
        // development, so the first request is always aborted; treating that
        // as a rejected session wiped the tokens that the second, successful
        // request had just validated, leaving the UI "signed in" with no
        // credentials to send.
        if (err instanceof DOMException && err.name === 'AbortError') return;

        // A network blip is not a rejected session either. Only give up the
        // session when the server actually refused the token — `request`
        // has already cleared the store in that case.
        if (err instanceof adminApi.AdminApiError && err.status === 401) {
          setUser(null);
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      setUser(await adminApi.login(username, password));
    } catch (err) {
      const message =
        err instanceof adminApi.AdminApiError ? err.message : 'Sign-in failed. Try again.';
      setError(message);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await adminApi.logout();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!adminApi.tokenStore.access) {
      setUser(null);
      return;
    }
    try {
      setUser(await adminApi.getMe());
    } catch {
      // A failed refresh is not a reason to discard a session the caller has
      // just established; `request` already clears the tokens on a real 401.
    }
  }, []);

  const adopt = useCallback((next: AdminUser) => {
    setError(null);
    setUser(next);
    // The first-mount effect may still be in flight on a hard navigation to
    // /login; make sure nothing is left waiting on it.
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, signIn, signOut, refresh, adopt }),
    [user, loading, error, signIn, signOut, refresh, adopt],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
