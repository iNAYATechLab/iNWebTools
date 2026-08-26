import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAdminAuth } from '../../hooks/useAdminAuth';

/**
 * Chrome for every /AdminDashboard route: sidebar, top bar and sign-out.
 */

type NavItem = { to: string; label: string; badge?: string };
type NavGroup = { heading: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    heading: 'Core Operations',
    items: [
      { to: '/AdminDashboard/Overview', label: '📊 System Overview' },
      { to: '/AdminDashboard/Tools/MasterManager', label: '🛠️ Master Tools Manager' },
    ],
  },
  {
    heading: 'Content & Monetization',
    items: [
      { to: '/AdminDashboard/CMS/Categories', label: '📂 Category CMS' },
      { to: '/AdminDashboard/Monetization/AdManager', label: '💰 AdSense & Ads' },
      { to: '/AdminDashboard/Settings/HeaderFooterManager', label: '🎨 Header & Footer' },
      { to: '/AdminDashboard/Settings/WidgetCustomizer', label: '🧩 Widget Customizer' },
    ],
  },
  {
    heading: 'Governance & RBAC',
    items: [
      { to: '/AdminDashboard/Users/RoleManager', label: '👥 Users & Roles' },
      { to: '/AdminDashboard/Security/AdminAccess', label: '🔒 Security & Access' },
    ],
  },
  {
    heading: 'Telemetry & Logs',
    items: [
      { to: '/AdminDashboard/Userinfo/UserOnlineNow', label: '🟢 Live Visitors' },
      { to: '/AdminDashboard/Userinfo/TimeRangeStats', label: '📈 Analytics & Stats' },
      { to: '/AdminDashboard/Logs/ConversionHistory', label: '📜 Execution Logs' },
      { to: '/AdminDashboard/Logs/SystemErrors', label: '⚠️ System Errors' },
    ],
  },
  {
    heading: 'Platform Config',
    items: [
      { to: '/AdminDashboard/Settings/LimitsConfig', label: '⚙️ Upload Limits' },
      { to: '/AdminDashboard/Settings/GlobalNotice', label: '📢 Global Notice' },
    ],
  },
];

export function AdminLayout() {
  const { user, signOut } = useAdminAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const currentLabel =
    NAV.flatMap((g) => g.items).find((i) => location.pathname.startsWith(i.to))?.label ??
    'Super Admin Dashboard';

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
                    `block rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-500/20 font-semibold text-brand-300 border border-brand-400/30'
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
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/10 bg-slate-950 p-4 transition-transform duration-200 overflow-y-auto lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-3">
          <div>
            <p className="text-base font-extrabold text-white flex items-center gap-1.5">
              <span className="text-brand-400">⚡</span> iNWebTools
            </p>
            <p className="text-[11px] text-slate-500 font-mono">Super Admin Hub</p>
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

        <div className="mt-8 border-t border-white/10 pt-3">
          <a
            href="/"
            className="block rounded-lg px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            ← Back to Public Website
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

          <p className="flex-1 truncate text-sm font-semibold text-slate-200">{currentLabel}</p>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 sm:inline flex items-center gap-1.5">
              <span>{user?.fullName || user?.username}</span>
              <span className="rounded-full bg-purple-500/15 border border-purple-400/30 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-300">
                {user?.role}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
