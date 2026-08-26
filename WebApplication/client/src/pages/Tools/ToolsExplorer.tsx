/**
 * The tool catalogue: one shell, three depths + working tool engine integration.
 *
 *   /tools                                       ToolsIndexPage
 *   /tools/:categorySlug                         CategoryPage
 *   /tools/:categorySlug/:subcategorySlug        SubcategoryPage
 *   /tools/:categorySlug/:subcategorySlug/:tool  ToolPage
 */

import { useEffect, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../components/categories/Breadcrumbs';
import { CategoryGrid } from '../../components/categories/CategoryGrid';
import { CategoryIcon } from '../../components/categories/CategoryIcon';
import { CategorySidebar } from '../../components/categories/CategorySidebar';
import { DocumentImageToolView } from '../../components/tools/DocumentImage/DocumentImageToolView';
import { useCategories } from '../../hooks/useCategories';
import { getToolsRegistry } from '../../services/toolsApi';
import { categoryPath, subcategoryPath } from '../../types/categories';
import type { ToolDefinition } from '../../types/tools';

/** Set the tab title, restoring the previous one on unmount. */
function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (!title) return undefined;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

/* ------------------------------------------------------------------ *
 * Shell
 * ------------------------------------------------------------------ */

export function ToolsLayout() {
  return (
    <div className="mx-auto grid w-full max-w-[90rem] flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <CategorySidebar className="lg:sticky lg:top-24 lg:self-start" />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * /tools
 * ------------------------------------------------------------------ */

export function ToolsIndexPage() {
  const { categories, loading } = useCategories();
  useDocumentTitle('All Tools — iNWebTools');

  const totalSubcategories = categories.reduce((sum, c) => sum + c.subcategories.length, 0);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Tools' }]} />

      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">All Tools</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
            Browse the full catalogue by category. {categories.length} categories and{' '}
            {totalSubcategories} sub-categories.
          </p>
        </div>

        {/* Quick Module Shortcuts */}
        <div className="flex flex-wrap gap-2">
          <Link
            to="/tools/document-pdf"
            className="rounded-xl border border-brand-400/30 bg-brand-500/10 px-3.5 py-2 text-xs font-semibold text-brand-300 hover:bg-brand-500/20 transition-colors"
          >
            📄 Document & PDF Engine →
          </Link>
          <Link
            to="/tools/image-graphics"
            className="rounded-xl border border-accent-400/30 bg-accent-500/10 px-3.5 py-2 text-xs font-semibold text-accent-300 hover:bg-accent-500/20 transition-colors"
          >
            🖼️ Image & Graphics Engine →
          </Link>
        </div>
      </header>

      <CategoryGrid categories={categories} loading={loading} />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * /tools/:categorySlug
 * ------------------------------------------------------------------ */

export function CategoryPage() {
  const { categorySlug } = useParams();
  const { categories, loading } = useCategories();

  const category = categories.find((c) => c.slug === categorySlug);
  useDocumentTitle(category ? `${category.name} — iNWebTools` : null);

  if (loading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="h-8 w-1/3 animate-pulse rounded bg-white/5" />
        <div className="h-32 animate-pulse rounded-2xl bg-white/[0.03]" />
      </div>
    );
  }

  if (!category) return <NotFoundPanel what={`Category "${categorySlug}"`} />;

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    { label: category.name },
  ];

  return (
    <>
      <Breadcrumbs items={crumbs} />

      <header className="mb-6 flex items-start gap-4">
        <span className="rounded-2xl border border-brand-400/20 bg-brand-500/10 p-3 text-brand-300">
          <CategoryIcon name={category.icon} className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white">{category.name}</h1>
          {category.description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
              {category.description}
            </p>
          )}
        </div>
      </header>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Sub-categories
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {category.subcategories.map((sub) => (
          <Link
            key={sub.id}
            to={subcategoryPath(category.slug, sub.slug)}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-brand-400/30 hover:bg-brand-500/[0.04]"
          >
            <h3 className="text-sm font-medium text-slate-200">{sub.name}</h3>
            {sub.description && (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{sub.description}</p>
            )}
            <p className="mt-2 text-[10px] text-slate-600">
              {sub.toolCount > 0 ? `${sub.toolCount} tools ready` : 'Available'}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * /tools/:categorySlug/:subcategorySlug
 * ------------------------------------------------------------------ */

export function SubcategoryPage() {
  const { categorySlug, subcategorySlug } = useParams();
  const { categories, loading: categoriesLoading } = useCategories();
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [toolsLoading, setToolsLoading] = useState<boolean>(true);

  const category = categories.find((c) => c.slug === categorySlug);
  const subcategory = category?.subcategories.find((s) => s.slug === subcategorySlug);

  useDocumentTitle(
    subcategory && category ? `${subcategory.name} — ${category.name} — iNWebTools` : null,
  );

  useEffect(() => {
    if (!subcategorySlug) return;
    setToolsLoading(true);
    getToolsRegistry({ subcategorySlug })
      .then((data) => {
        setTools(data.tools);
      })
      .catch(() => setTools([]))
      .finally(() => setToolsLoading(false));
  }, [subcategorySlug]);

  if (categoriesLoading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="h-8 w-1/3 animate-pulse rounded bg-white/5" />
        <div className="h-32 animate-pulse rounded-2xl bg-white/[0.03]" />
      </div>
    );
  }

  if (!category) return <NotFoundPanel what={`Category "${categorySlug}"`} />;
  if (!subcategory) {
    return <NotFoundPanel what={`"${subcategorySlug}" in ${category.name}`} />;
  }

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    { label: category.name, to: categoryPath(category.slug) },
    { label: subcategory.name },
  ];

  return (
    <>
      <Breadcrumbs items={crumbs} />

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">{subcategory.name}</h1>
        {subcategory.description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
            {subcategory.description}
          </p>
        )}
      </header>

      {/* Render tools grid if published tools exist */}
      {toolsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/[0.02]" />
          ))}
        </div>
      ) : tools.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tools ({tools.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tools.map((t) => (
              <Link
                key={t.slug}
                to={`/tools/${t.module}/${t.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/50 p-5 transition-all hover:border-brand-400/40 hover:bg-slate-900/90"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                      <CategoryIcon name={t.icon || 'wrench'} className="h-4 w-4" />
                    </span>
                    {t.isFeatured && (
                      <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
                        ⭐ Popular
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
                  <span>
                    {t.inputFormats?.slice(0, 2).join(', ')} → {t.defaultOutput?.toUpperCase()}
                  </span>
                  <span className="text-brand-400 font-sans font-semibold">Open Tool →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-sm font-medium text-slate-300">No tools published here yet</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            This sub-category is registered and its URL is live. Tools added to{' '}
            <code className="rounded bg-white/5 px-1 py-0.5 text-slate-400">
              {subcategory.slug}
            </code>{' '}
            will appear here automatically.
          </p>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * /tools/:categorySlug/:subcategorySlug/:toolSlug
 * ------------------------------------------------------------------ */

export function ToolPage() {
  const { toolSlug } = useParams();
  return <DocumentImageToolView slugOverride={toolSlug} />;
}

/* ------------------------------------------------------------------ *
 * Shared
 * ------------------------------------------------------------------ */

function NotFoundPanel({ what }: { what: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
      <p className="text-sm font-medium text-slate-300">{what} was not found</p>
      <p className="mt-2 text-xs text-slate-500">It may have been renamed or deactivated.</p>
      <Link
        to="/tools"
        className="mt-4 inline-block rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5"
      >
        ← All tools
      </Link>
    </div>
  );
}
