import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../categories/Breadcrumbs';
import { CategoryIcon } from '../../categories/CategoryIcon';
import { getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition } from '../../../types/tools';

const SUBCATEGORY_FILTERS = [
  { id: 'all', label: 'All Developer Tools' },
  { id: 'code-api-converters', label: '⚡ Code & API Converters' },
  { id: 'data-converters-parsers', label: '📦 Data Converters & Parsers' },
  { id: 'code-minifiers-beautifiers', label: '🧹 Minifiers & Beautifiers' },
  { id: 'string-encoders-decoders', label: '🔐 Encoders & Decoders' },
  { id: 'number-base-radix-converters', label: '🔢 Radix & Bitwise' },
];

export function DeveloperExplorer() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    document.title = 'Developer Utilities & Code Converters — iNWebTools';
    setLoading(true);
    getToolsRegistry({ module: 'developer-code' })
      .then((data) => {
        setTools(data.tools);
      })
      .catch(() => setTools([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredTools = useMemo(() => {
    return tools.filter((t) => {
      const matchesSubcategory = activeFilter === 'all' || t.subcategorySlug === activeFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.tagline && t.tagline.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)));
      return matchesSubcategory && matchesSearch;
    });
  }, [tools, activeFilter, search]);

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    { label: 'Developer & Code Utilities' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      <Breadcrumbs items={crumbs} />

      {/* Hero Header */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-950/60 via-slate-900 to-slate-950 p-6 sm:p-10 backdrop-blur-md">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/20 ring-1 ring-white/20">
                <CategoryIcon name="code" className="h-6 w-6" />
              </span>
              <span className="rounded-full bg-brand-500/10 px-3 py-1 font-mono text-xs font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/30">
                Phase 3 Engine • {tools.length} Tools Ready
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Developer Utilities & Code Transpilers
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              High-performance browser workbench for cURL to multi-language HTTP client code, JSON
              to strongly-typed interfaces (TS, Go, Rust, Python, Swift, Dart), multi-format data
              parsers, code minifiers, SQL formatters, and cryptographic string encoders.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
              <div className="text-2xl font-black text-brand-400">10+</div>
              <div className="text-[11px] text-slate-400 font-medium">Languages Supported</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
              <div className="text-2xl font-black text-emerald-400">0ms</div>
              <div className="text-[11px] text-slate-400 font-medium">In-Memory Execution</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <div className="text-2xl font-black text-accent-400">100%</div>
              <div className="text-[11px] text-slate-400 font-medium">Privacy Guaranteed</div>
            </div>
          </div>
        </div>
      </header>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Subcategory Pills */}
        <div className="flex flex-wrap gap-2">
          {SUBCATEGORY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeFilter === f.id
                  ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-md shadow-brand-500/20'
                  : 'border border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:bg-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Live Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search developer tools..."
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tools Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/[0.02]" />
          ))}
        </div>
      ) : filteredTools.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.map((t) => (
            <Link
              key={t.slug}
              to={`/tools/developer-code/${t.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/50 p-5 transition-all hover:border-brand-400/40 hover:bg-slate-900/90"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <CategoryIcon name={t.icon || 'code'} className="h-5 w-5" />
                  </span>
                  {t.isFeatured && (
                    <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
                      ⭐ Featured
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                  {t.name}
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {t.tagline || t.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-slate-400 font-mono">
                <span>
                  {t.inputFormats?.slice(0, 2).join(', ')} → {t.defaultOutput?.toUpperCase()}
                </span>
                <span className="font-sans font-semibold text-brand-400 group-hover:translate-x-0.5 transition-transform">
                  Launch →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <p className="text-sm font-medium text-slate-300">No developer tools found</p>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search query or filter tags.
          </p>
        </div>
      )}
    </div>
  );
}
