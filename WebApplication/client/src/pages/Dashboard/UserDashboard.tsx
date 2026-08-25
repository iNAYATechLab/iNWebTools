import { Link } from 'react-router-dom';

import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useLocale } from '../../hooks/useLocale';
import { AuthCharacter } from '../../components/auth/AuthCharacter';

/**
 * Landing page for role 'user'.
 *
 * Intentionally small: it exists so role-based redirection has somewhere real
 * to send a non-staff account. Per-user history and saved transcripts belong
 * here later, once transcriptions are associated with an account.
 */
export function UserDashboard() {
  const { user, signOut } = useAdminAuth();
  const { t } = useLocale();

  if (!user) return null;

  const isStaff = user.role === 'admin' || user.role === 'super_admin';

  return (
    <div className="min-h-screen bg-ink-900 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl">
          <AuthCharacter mood="cheering" className="hidden h-24 w-24 shrink-0 sm:block" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {t.auth.dashboard.greeting} {user.fullName || user.username}
            </h1>
            <p className="mt-1 text-sm text-slate-400">{t.auth.dashboard.subtitle}</p>
            <span className="mt-3 inline-block rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-200">
              {user.role}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            to="/"
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:bg-white/5"
          >
            <p className="font-semibold text-white">{t.auth.dashboard.transcribeTitle}</p>
            <p className="mt-1 text-sm text-slate-400">{t.auth.dashboard.transcribeBody}</p>
          </Link>

          {/* Only staff see a door they can actually walk through. */}
          {isStaff && (
            <Link
              to="/AdminDashboard"
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:bg-white/5"
            >
              <p className="font-semibold text-white">{t.auth.dashboard.adminTitle}</p>
              <p className="mt-1 text-sm text-slate-400">{t.auth.dashboard.adminBody}</p>
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          {t.account.signOut}
        </button>
      </div>
    </div>
  );
}
