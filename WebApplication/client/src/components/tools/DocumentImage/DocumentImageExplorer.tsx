import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../categories/Breadcrumbs';
import { CategoryIcon } from '../../categories/CategoryIcon';
import { getToolsRegistry } from '../../../services/toolsApi';
import type { ToolDefinition, ToolModule } from '../../../types/tools';

interface DocumentImageExplorerProps {
  moduleSlug?: 'document-pdf' | 'image-graphics';
}

export function DocumentImageExplorer({ moduleSlug }: DocumentImageExplorerProps) {
  const params = useParams<{ module?: string }>();
  const activeModule = moduleSlug || params.module || 'document-pdf';

  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [moduleInfo, setModuleInfo] = useState<ToolModule | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getToolsRegistry({ module: activeModule })
      .then((data) => {
        if (!mounted) return;
        setTools(data.tools);
        const mod = data.modules.find((m) => m.id === activeModule) ?? null;
        setModuleInfo(mod);
        document.title = `${mod?.name || 'Tools'} — iNWebTools`;
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeModule]);

  const allTags = Array.from(new Set(tools.flatMap((t) => t.tags || []))).slice(0, 10);

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      search === '' ||
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.slug.toLowerCase().includes(search.toLowerCase()) ||
      (tool.tagline && tool.tagline.toLowerCase().includes(search.toLowerCase()));

    const matchesTag = selectedTag === 'all' || (tool.tags && tool.tags.includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    {
      label:
        moduleInfo?.name ||
        (activeModule === 'document-pdf' ? 'Document & PDF' : 'Image & Graphics'),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <Breadcrumbs items={crumbs} />

      {/* Module Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-brand-900/30 via-slate-900 to-accent-900/20 p-8">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/30">
              Phase 1 Platform Engine
            </span>
            <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
              {moduleInfo?.name ||
                (activeModule === 'document-pdf'
                  ? 'Document & PDF Tools'
                  : 'Image & Graphics Utilities')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 leading-relaxed">
              {moduleInfo?.description ||
                'High-performance processing engines for enterprise converters, image editors, and PDF management.'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center">
              <span className="block text-2xl font-black text-brand-400">{tools.length}</span>
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Available Tools
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Search & Tag Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools by name, format, or tag..."
            className="w-full rounded-2xl border border-white/15 bg-slate-900/80 px-4 py-3 pl-10 text-xs text-slate-200 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
          <svg
            className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedTag('all')}
              className={`rounded-xl px-3 py-1.5 font-medium transition-colors ${
                selectedTag === 'all'
                  ? 'bg-brand-500 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`rounded-xl px-3 py-1.5 font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-brand-500 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tools Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/[0.02]" />
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-sm font-medium text-slate-300">No tools matched "{search}"</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedTag('all');
            }}
            className="mt-3 text-xs text-brand-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool) => (
            <Link
              key={tool.slug}
              to={`/tools/${activeModule}/${tool.slug}`}
              className="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/50 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-400/40 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-brand-500/10"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <CategoryIcon name={tool.icon || 'wrench'} className="h-5 w-5" />
                  </span>
                  {tool.isFeatured && (
                    <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-400/30">
                      Featured
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-base font-bold text-white group-hover:text-brand-300 transition-colors">
                  {tool.name}
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {tool.tagline || tool.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-slate-400">
                <span className="font-mono text-[10px] text-slate-400">
                  {tool.inputFormats?.slice(0, 3).join(', ')} → {tool.defaultOutput?.toUpperCase()}
                </span>
                <span className="font-semibold text-brand-400 group-hover:translate-x-0.5 transition-transform">
                  Launch →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
