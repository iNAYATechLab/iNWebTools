import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getSystemStats, syncAdminTools } from '../../../services/adminApi';
import type { SystemStats } from '../../../types/admin';

export function SystemOverview() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    setLoading(true);
    getSystemStats()
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err) => setError(err.message || 'Failed to load system stats.'))
      .finally(() => setLoading(false));
  };

  const handleSyncTools = async () => {
    setSyncing(true);
    try {
      const res = await syncAdminTools();
      setSyncMessage(res.message || 'Tools successfully synchronized!');
      loadStats();
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      setSyncMessage(err.message || 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded bg-white/5" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.03]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-300">
        <p className="font-semibold">Error Loading System Overview</p>
        <p className="mt-1 text-xs">{error}</p>
        <button
          onClick={loadStats}
          className="mt-4 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500/30"
        >
          Retry
        </button>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d > 0 ? `${d}d ` : ''}${h}h ${m}m`;
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Super Admin Control Center
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time telemetry, tool executions, server health, and platform governance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSyncTools}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-400/30 bg-brand-500/10 px-4 py-2 text-xs font-semibold text-brand-300 hover:bg-brand-500/20 disabled:opacity-50 transition-colors"
          >
            <span>🔄</span>
            <span>{syncing ? 'Syncing...' : 'Sync Tools Registry'}</span>
          </button>
          <Link
            to="/AdminDashboard/Monetization/AdManager"
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
          >
            💰 Monetization & Ads
          </Link>
          <Link
            to="/AdminDashboard/Users/RoleManager"
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
          >
            👥 User & Roles
          </Link>
        </div>
      </div>

      {syncMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          {syncMessage}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Users
            </span>
            <span className="rounded-lg bg-blue-500/10 p-2 text-blue-400">👥</span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">{stats?.users.total ?? 0}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Super Admins: {stats?.users.superAdmins ?? 0}</span>
            <span className="text-emerald-400">Active: {stats?.users.active ?? 0}</span>
          </div>
        </div>

        {/* Total Tools Registered */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Registered Tools
            </span>
            <span className="rounded-lg bg-brand-500/10 p-2 text-brand-400">🛠️</span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">{stats?.tools.total ?? 0}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span className="text-emerald-400">Published: {stats?.tools.published ?? 0}</span>
            <span className="text-amber-400">Featured: {stats?.tools.featured ?? 0}</span>
          </div>
        </div>

        {/* Total Executions */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Executions
            </span>
            <span className="rounded-lg bg-purple-500/10 p-2 text-purple-400">⚡</span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">
            {stats?.tools.totalExecutions ?? 0}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Today: {stats?.todayActivity.executions ?? 0}</span>
            <span className="text-emerald-400">Success: {stats?.todayActivity.successes ?? 0}</span>
          </div>
        </div>

        {/* Node Memory & Telemetry */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Server RAM RSS
            </span>
            <span className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">💻</span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">
            {stats?.system.memory.rssMb ?? 0}{' '}
            <span className="text-sm font-normal text-slate-400">MB</span>
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Heap: {stats?.system.memory.heapUsedMb ?? 0} MB</span>
            <span className="text-cyan-400">
              Uptime: {formatUptime(stats?.system.uptimeSeconds ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Server & Engine Telemetry Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Runtime Environment */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span>🖥️</span> System Runtime & Infrastructure
          </h2>
          <dl className="grid grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <dt className="text-slate-500">Node.js Engine</dt>
              <dd className="mt-1 font-mono font-semibold text-white">
                {stats?.system.nodeVersion} ({stats?.system.arch})
              </dd>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <dt className="text-slate-500">Database Engine</dt>
              <dd className="mt-1 font-mono font-semibold text-emerald-400">
                {stats?.system.database.engine} ({stats?.system.database.status})
              </dd>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <dt className="text-slate-500">ASR Voice Model</dt>
              <dd className="mt-1 font-mono font-semibold text-brand-300 truncate">
                {stats?.system.asrModel}
              </dd>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <dt className="text-slate-500">Environment</dt>
              <dd className="mt-1 font-mono font-semibold text-amber-400 uppercase">
                {stats?.system.environment}
              </dd>
            </div>
          </dl>
        </div>

        {/* Quick Links & Shortcuts */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span>🚀</span> Super Admin Operations
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
            <Link
              to="/AdminDashboard/Tools/MasterManager"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 p-3 text-slate-200 hover:border-brand-400/40 hover:bg-slate-800 transition-all"
            >
              <span>🛠️ Tools Catalog</span>
              <span>→</span>
            </Link>
            <Link
              to="/AdminDashboard/CMS/Categories"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 p-3 text-slate-200 hover:border-brand-400/40 hover:bg-slate-800 transition-all"
            >
              <span>📂 Category CMS</span>
              <span>→</span>
            </Link>
            <Link
              to="/AdminDashboard/Monetization/AdManager"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 p-3 text-slate-200 hover:border-brand-400/40 hover:bg-slate-800 transition-all"
            >
              <span>💰 AdSense Config</span>
              <span>→</span>
            </Link>
            <Link
              to="/AdminDashboard/Users/RoleManager"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 p-3 text-slate-200 hover:border-brand-400/40 hover:bg-slate-800 transition-all"
            >
              <span>👥 User RBAC</span>
              <span>→</span>
            </Link>
            <Link
              to="/AdminDashboard/Logs/ConversionHistory"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 p-3 text-slate-200 hover:border-brand-400/40 hover:bg-slate-800 transition-all"
            >
              <span>📜 Execution Logs</span>
              <span>→</span>
            </Link>
            <Link
              to="/AdminDashboard/Security/AdminAccess"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 p-3 text-slate-200 hover:border-brand-400/40 hover:bg-slate-800 transition-all"
            >
              <span>🔒 Security Audit</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
