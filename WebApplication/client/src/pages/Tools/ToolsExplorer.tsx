/**
 * The tool catalogue: one shell, three depths.
 *
 *   /tools                                       ToolsIndexPage
 *   /tools/:categorySlug                         CategoryPage
 *   /tools/:categorySlug/:subcategorySlug        SubcategoryPage
 *   /tools/:categorySlug/:subcategorySlug/:tool  ToolPage
 *
 * `ToolsLayout` is the shared chrome — persistent sidebar plus an `Outlet` —
 * so navigating between depths swaps only the panel and never remounts the
 * navigation. That keeps the sidebar's expanded groups and scroll position
 * intact across clicks, which a per-page sidebar would throw away.
 *
 * Document title
 * --------------
 * Each page sets `document.title` on mount. This is a client-rendered SPA, so
 * there is no server-side <head> to populate; setting it here is what makes a
 * bookmarked or shared category URL show something meaningful instead of the
 * generic site title. (Real crawler-facing metadata needs SSR or prerendering
 * — noted in the docs as a known limitation, not solved here.)
 */

import { useEffect } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';

import { Breadcrumbs, type Crumb } from '../../components/categories/Breadcrumbs';
import { CategoryGrid } from '../../components/categories/CategoryGrid';
import { CategoryIcon } from '../../components/categories/CategoryIcon';
import { CategorySidebar } from '../../components/categories/CategorySidebar';
import { useCategories } from '../../hooks/useCategories';
import { categoryPath, subcategoryPath, toolPath } from '../../types/categories';

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
      {/*
        Sticky from lg up; below that it collapses to the top of the page so
        the content a visitor navigated for comes first on a phone.
      */}
      <CategorySidebar className="lg:sticky lg:top-24 lg:self-start" />

      {/* min-w-0: without it a long card title stops this track from shrinking. */}
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

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">All Tools</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Browse the full catalogue by category. {categories.length} categories and{' '}
          {totalSubcategories} sub-categories.
        </p>
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

  // Resolved from the shared tree rather than its own request: the tree is
  // already loaded for the sidebar, so a second fetch would be redundant.
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
              {sub.toolCount > 0 ? `${sub.toolCount} tools` : 'Coming soon'}
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
  const { categories, loading } = useCategories();

  const category = categories.find((c) => c.slug === categorySlug);
  // Looked up *within* the resolved parent: subcategory slugs are unique only
  // per category, so /image-graphics-tools/pdf-converters must not resolve.
  const subcategory = category?.subcategories.find((s) => s.slug === subcategorySlug);

  useDocumentTitle(
    subcategory && category ? `${subcategory.name} — ${category.name} — iNWebTools` : null,
  );

  if (loading) {
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

      {/*
        The tool registry is not populated yet, so this states that plainly
        instead of rendering an empty grid that looks like a loading failure.
        The route, the breadcrumbs and the URL contract are all live now, which
        is what lets tools be added later without touching routing.
      */}
      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
        <p className="text-sm font-medium text-slate-300">No tools published here yet</p>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
          This sub-category is registered and its URL is live. Tools added to{' '}
          <code className="rounded bg-white/5 px-1 py-0.5 text-slate-400">{subcategory.slug}</code>{' '}
          will appear here automatically.
        </p>
        <p className="mt-3 text-[10px] text-slate-600">
          Tool URLs will look like{' '}
          <code className="text-slate-500">
            {toolPath(category.slug, subcategory.slug, 'example-tool')}
          </code>
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * /tools/:categorySlug/:subcategorySlug/:toolSlug
 * ------------------------------------------------------------------ */

/**
 * Placeholder for a specific tool.
 *
 * The route exists now so the three-level URL contract is real and linkable
 * from day one. Once the tool registry is populated this resolves the slug
 * against it and renders the tool; until then it reports honestly rather than
 * 404ing, because the URL shape itself is what was being specified.
 */
export function ToolPage() {
  const { categorySlug, subcategorySlug, toolSlug } = useParams();
  const { categories, loading } = useCategories();

  const category = categories.find((c) => c.slug === categorySlug);
  const subcategory = category?.subcategories.find((s) => s.slug === subcategorySlug);

  useDocumentTitle(toolSlug ? `${toolSlug} — iNWebTools` : null);

  if (loading) return <div className="h-32 animate-pulse rounded-2xl bg-white/[0.03]" />;
  if (!category || !subcategory) {
    return <NotFoundPanel what={`${categorySlug}/${subcategorySlug}`} />;
  }

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    { label: 'Tools', to: '/tools' },
    { label: category.name, to: categoryPath(category.slug) },
    { label: subcategory.name, to: subcategoryPath(category.slug, subcategory.slug) },
    { label: toolSlug ?? '' },
  ];

  return (
    <>
      <Breadcrumbs items={crumbs} />

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <h1 className="text-lg font-semibold text-white">{toolSlug}</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
          This tool is not in the registry yet. The route is live and resolves through{' '}
          {category.name} → {subcategory.name}.
        </p>
        <Link
          to={subcategoryPath(category.slug, subcategory.slug)}
          className="mt-4 inline-block rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5"
        >
          ← Back to {subcategory.name}
        </Link>
      </div>
    </>
  );
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
