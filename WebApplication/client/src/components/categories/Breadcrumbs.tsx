/**
 * Breadcrumb trail for the nested tool URLs.
 *
 * Two jobs, and the second is the reason this is not just styling:
 *
 *   1. Orientation — at /tools/pdf-document-tools/pdf-converters/pdf-to-word a
 *      visitor needs a way back up the tree.
 *   2. SEO — the JSON-LD BreadcrumbList below is what makes Google render the
 *      hierarchy in a search result instead of a bare URL. Given the whole
 *      point of this URL structure is search visibility, emitting the
 *      structured data is part of the feature, not an extra.
 *
 * The JSON-LD is built from the same `items` array that renders the visible
 * trail, so the two cannot disagree — a mismatch between visible breadcrumbs
 * and their markup is treated as spam by search engines.
 */

import { Link } from 'react-router-dom';

export type Crumb = { label: string; to?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;

  /*
   * Absolute URLs are required by the spec. `window.location.origin` is right
   * here because the SPA is client-rendered: there is no build-time origin,
   * and hardcoding the production domain would emit wrong URLs in every
   * preview and staging environment.
   */
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.to ? { item: `${origin}${item.to}` } : {}),
    })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                {item.to && !isLast ? (
                  <Link to={item.to} className="transition-colors hover:text-slate-300">
                    {item.label}
                  </Link>
                ) : (
                  // The current page is not a link, and carries aria-current.
                  <span
                    className={isLast ? 'text-slate-300' : undefined}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
                {!isLast && (
                  <span aria-hidden="true" className="text-slate-700">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
