import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAdminAuth } from '../../hooks/useAdminAuth';

/**
 * Gate for any signed-in account, whatever the role.
 *
 * Unlike RequireAdmin this redirects to /login rather than rendering the form
 * in place, and carries the attempted path so the user lands where they meant
 * to go after signing in.
 *
 * A UX gate only — the API verifies every token server-side.
 */
export function RequireUser({ children }: { children: ReactNode }) {
  const { user, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-900">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-brand-400" />
      </div>
    );
  }

  if (!user) {
    // `reason` makes the bounce visible. A silent redirect looked exactly like
    // "the button does nothing" whenever a session failed to establish, which
    // is the hardest kind of bug for a user to report.
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search, reason: 'session' }}
        replace
      />
    );
  }

  return <>{children}</>;
}
