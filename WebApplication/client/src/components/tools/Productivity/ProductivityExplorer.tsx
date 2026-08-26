import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Breadcrumbs } from '../../categories/Breadcrumbs';
import { CategoryIcon } from '../../categories/CategoryIcon';
import { getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition } from '../../../types/tools';

export function ProductivityExplorer() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    getToolsRegistry({ module: 'ai-productivity' })
      .then((data) => setTools(data.tools))
      .catch(() => setTools([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredTools = tools.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'ai-text') {
      return t.slug.startsWith('ai-');
    }
    if (activeTab === 'qr-barcode') {
      return t.slug.includes('qr') || t.slug.includes('barcode');
    }
    if (activeTab === 'time-date') {
      return (
        t.slug.includes('time') ||
        t.slug.includes('clock') ||
        t.slug.includes('date') ||
        t.slug.includes('age') ||
        t.slug.includes('stopwatch') ||
        t.slug.includes('countdown')
      );
    }
    if (activeTab === 'productivity-apps') {
      return (
        t.slug.includes('pomodoro') ||
        t.slug.includes('kanban') ||
        t.slug.includes('habit') ||
        t.slug.includes('notepad') ||
        t.slug.includes('wheel')
      );
    }
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Tools', to: '/tools' },
          { label: 'AI Utilities & Productivity Tools' },
        ]}
      />

      {/* Hero Header */}
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/90 to-purple-950/40 p-6 sm:p-10 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
              <span>⚡ Phase 8 Productivity Suite</span>
              <span className="h-1 w-1 rounded-full bg-purple-400" />
              <span>25 Smart AI, QR & Time Engines</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              AI Utilities, QR Engine & Productivity Tools
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">
              Accelerate daily productivity with AI prompt optimizers, paraphrasers, vector QR code
              and barcode generators, time zone planners, interactive Pomodoro focus timers, and
              offline Kanban boards.
            </p>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center backdrop-blur">
              <span className="block text-2xl font-black text-purple-400">7</span>
              <span className="text-[11px] font-medium text-slate-400">Smart AI Text Tools</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center backdrop-blur">
              <span className="block text-2xl font-black text-brand-400">18</span>
              <span className="text-[11px] font-medium text-slate-400">QR, Time & App Tools</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Tools (25)' },
            { id: 'ai-text', label: '🤖 AI & Text Assistants (7)' },
            { id: 'qr-barcode', label: '🔳 QR & Barcode (5)' },
            { id: 'time-date', label: '⏰ Time & Date (8)' },
            { id: 'productivity-apps', label: '📋 Productivity Apps (5)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                  : 'border border-white/10 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search AI & productivity..."
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Tools Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/[0.02]" />
          ))}
        </div>
      ) : filteredTools.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.map((t) => (
            <Link
              key={t.slug}
              to={`/tools/ai-productivity/${t.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/40 p-5 backdrop-blur-md transition-all hover:border-brand-400/40 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-brand-500/5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-400/20 bg-brand-500/10 text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <CategoryIcon name={t.icon || 'zap'} className="h-5 w-5" />
                  </span>
                  {t.isFeatured && (
                    <span className="rounded-full bg-purple-400/10 px-2 py-0.5 text-[9px] font-semibold text-purple-300 ring-1 ring-inset ring-purple-400/30">
                      ★ Featured
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                  {t.name}
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                  {t.tagline || t.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-slate-400 font-mono">
                <span>Output: {t.defaultOutput?.toUpperCase()}</span>
                <span className="text-brand-400 font-sans font-semibold group-hover:translate-x-0.5 transition-transform">
                  Launch App →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <p className="text-sm font-medium text-slate-300">
            No productivity tools match your filter
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setSearchQuery('');
            }}
            className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
