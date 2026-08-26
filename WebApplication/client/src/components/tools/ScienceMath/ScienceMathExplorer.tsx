import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../categories/Breadcrumbs';
import { CategoryIcon } from '../../categories/CategoryIcon';
import { getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition } from '../../../types/tools';

const SUBSECTIONS = [
  { id: 'all', label: 'All Tools (24)', filter: () => true },
  {
    id: 'health',
    label: '❤️ Health & Fitness (10)',
    filter: (t: ToolDefinition) =>
      [
        'bmi-calculator',
        'bmr-calculator',
        'body-fat-percentage-calculator',
        'ideal-body-weight-calculator',
        'waist-to-height-hip-ratio-calculator',
        'daily-calorie-intake-calculator',
        'water-intake-calculator',
        'target-heart-rate-calculator',
        'pregnancy-due-date-calculator',
        'macro-nutrient-calculator',
      ].includes(t.slug),
  },
  {
    id: 'math',
    label: '📐 Math & Geometry (8)',
    filter: (t: ToolDefinition) =>
      [
        'matrix-calculator',
        'fraction-calculator',
        'prime-factorization-tool',
        'gcd-lcm-calculator',
        'quadratic-equation-solver',
        'exponential-logarithm-calculator',
        'scientific-calculator-online',
        'geometry-area-volume-calculator',
      ].includes(t.slug),
  },
  {
    id: 'physics',
    label: '⚡ Physics & Formulas (6)',
    filter: (t: ToolDefinition) =>
      [
        'speed-velocity-acceleration-calculator',
        'force-newton-calculator',
        'work-energy-calculator',
        'ohms-law-calculator',
        'power-energy-cost-calculator',
        'frequency-wavelength-converter',
      ].includes(t.slug),
  },
];

export function ScienceMathExplorer() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    document.title = 'Health, Mathematics & Scientific Suite — iNWebTools';
    getToolsRegistry({ module: 'math-science' })
      .then((data) => {
        setTools(data.tools);
      })
      .catch(() => setTools([]))
      .finally(() => setLoading(false));
  }, []);

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    { label: 'Health, Mathematics & Science' },
  ];

  const currentFilter = SUBSECTIONS.find((s) => s.id === activeTab)?.filter || (() => true);

  const filteredTools = tools
    .filter(currentFilter)
    .filter(
      (t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      <Breadcrumbs items={crumbs} />

      {/* Hero Header */}
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 p-6 sm:p-10 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <span>🔬 Phase 9 Scientific Suite</span>
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
              <span>24 Health, Math & Physics Engines</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Health, Mathematics & Scientific Utilities
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">
              High-precision scientific computation suite covering medical BMI & BMR body metrics,
              advanced matrix algebra, quadratic solvers, geometry areas/volumes, kinematics, Ohm’s
              law, and energy conversion algorithms.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center backdrop-blur">
              <span className="block text-2xl font-black text-emerald-400">10</span>
              <span className="text-[11px] font-medium text-slate-400">Health & Fitness</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center backdrop-blur">
              <span className="block text-2xl font-black text-brand-400">14</span>
              <span className="text-[11px] font-medium text-slate-400">Math & Physics</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex flex-wrap gap-2">
          {SUBSECTIONS.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setActiveTab(sub.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === sub.id
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'border border-white/10 bg-slate-900/40 text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search health, math & science..."
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Tools Cards Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/[0.02]" />
          ))}
        </div>
      ) : filteredTools.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((t) => (
            <Link
              key={t.slug}
              to={`/tools/math-science/${t.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/40 p-5 transition-all hover:border-emerald-400/40 hover:bg-slate-900/80"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <CategoryIcon name={t.icon || 'activity'} className="h-5 w-5" />
                  </span>
                  {t.isFeatured && (
                    <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
                      ★ Featured
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {t.name}
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {t.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-slate-400">
                <span className="font-mono text-emerald-400/80">Scientific Engine</span>
                <span className="font-semibold text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                  Launch Tool →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-400 text-xs">
          No tools found matching your search.
        </div>
      )}
    </div>
  );
}
