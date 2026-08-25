import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAdminAuth } from '../../hooks/useAdminAuth';

/**
 * Chrome for every /AdminDashboard route: sidebar, top bar and sign-out.
 *
 * The sidebar is a fixed drawer on phones and a static column from lg up, so
 * the same markup serves both without duplicating the nav.
 */

type NavItem = { to: string; label: string };
type NavGroup = { heading: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    heading: 'Userinfo',
    items: [
      { to: '/AdminDashboard/Userinfo/UserOnlineNow', label: 'User Online Now' },
      { to: '/AdminDashboard/Userinfo/TimeRangeStats', label: 'Time Range Stats' },
    ],
  },
  {
    heading: 'Logs',
    items: [
      { to: '/AdminDashboard/Logs/ConversionHistory', label: 'Conversion History' },
      { to: '/AdminDashboard/Logs/SystemErrors', label: 'System Errors' },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { to: '/AdminDashboard/Settings/LimitsConfig', label: 'Limits Config' },
      { to: '/AdminDashboard/Settings/GlobalNotice', label: 'Global Notice' },
      { to: '/AdminDashboard/Settings/HeaderFooterManager', label: 'Header & Footer CMS' },
    ],
  },
  {
    heading: 'Security',
    items: [{ to: '/AdminDashboard/Security/AdminAccess', label: 'Admin Access' }],
  },
];

export function AdminLayout() {
  const { user, signOut } = useAdminAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const currentLabel =
    NAV.flatMap((g) => g.items).find((i) => location.pathname.startsWith(i.to))?.label ??
    'Overview';

  const nav = (
    <nav className="space-y-6" aria-label="Admin sections">
      {NAV.map((group) => (
        <div key={group.heading}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {group.heading}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-brand-500/15 font-medium text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/10 bg-slate-950 p-4 transition-transform duration-200 lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-3">
          <div>
            <p className="text-sm font-semibold text-white">iNWebTools</p>
            <p className="text-[11px] text-slate-500">Admin Dashboard</p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 lg:hidden"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {nav}

        <div className="absolute inset-x-4 bottom-4 border-t border-white/10 pt-3">
          <a
            href="/"
            className="block rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            ← Back to the app
          </a>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 lg:hidden"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M3 5.75A.75.75 0 0 1 3.75 5h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75Zm0 4.5A.75.75 0 0 1 3.75 9.5h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Zm0 4.5a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <p className="flex-1 truncate text-sm font-medium text-slate-300">{currentLabel}</p>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">
              {user?.username}
              <span className="ml-1.5 rounded border border-white/15 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
                {user?.role}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
