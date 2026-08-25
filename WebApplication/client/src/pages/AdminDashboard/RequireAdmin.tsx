import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAdminAuth } from '../../hooks/useAdminAuth';
import { STAFF_ROLES } from '../../types/admin';

/**
 * Gate for the operator dashboard.
 *
 * Redirects to the shared /login page rather than rendering a second sign-in
 * form of its own. There used to be one here, which meant two login screens
 * with two implementations — and an operator who signed in at /login still
 * met the old form on arriving at /AdminDashboard.
 *
 * The attempted path travels in router state so /login can return the user
 * to where they were headed.
 *
 * Two distinct refusals:
 *   - not signed in    -> /login
 *   - signed in, not staff -> their own dashboard, not a dead end
 *
 * A UX gate, not the security boundary: every /api/admin route verifies the
 * token server-side regardless of what the client renders.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-brand-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search, reason: 'session' }}
        replace
      />
    );
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return <Navigate to={user.homePath ?? '/Dashboard'} replace />;
  }

  return <>{children}</>;
}
