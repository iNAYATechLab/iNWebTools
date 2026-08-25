import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAdminAuth } from '../hooks/useAdminAuth';
import { useLocale } from '../hooks/useLocale';

/** Initials for the avatar: "admin" -> "AD", "ada lovelace" -> "AL". */
function initials(username: string) {
  const [first, second] = username
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (!first) return '?';
  if (!second) return first.slice(0, 2).toUpperCase();
  return (first.slice(0, 1) + second.slice(0, 1)).toUpperCase();
}

/**
 * Header account control.
 *
 * Signed out it is a sign-in link; signed in it is a profile menu. The
 * distinction is cosmetic — every /api/admin route verifies the token
 * server-side, so hiding this would not protect anything.
 */
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { user, loading, signOut } = useAdminAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape. Both listeners are only attached
  // while the menu is open so the page keeps no handlers it does not need.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Hold the space while the stored token is being verified. Rendering the
  // sign-in link first would make it flash and then swap to the avatar on
  // every reload for an already-authenticated operator.
  if (loading) {
    return <span className="h-9 w-9 animate-pulse rounded-full bg-white/5" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
          <path
            d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {!compact && t.account.signIn}
      </Link>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.account.menuLabel}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2 transition-colors hover:bg-white/10"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-[11px] font-bold text-white">
          {initials(user.username)}
        </span>
        <span className="hidden max-w-[8rem] truncate text-xs font-semibold text-slate-200 sm:block">
          {user.username}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3 w-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-ink-900/95 shadow-xl shadow-black/40 backdrop-blur-xl"
        >
          <div className="border-b border-white/5 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-white">{user.username}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">{user.role}</p>
          </div>

          <Link
            to={user.homePath ?? '/Dashboard'}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path
                d="M4 5h6v6H4zM14 5h6v4h-6zM14 13h6v6h-6zM4 15h6v4H4z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
            {t.account.dashboard}
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-2.5 border-t border-white/5 px-3 py-2 text-left text-sm text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t.account.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
