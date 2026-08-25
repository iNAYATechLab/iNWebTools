/**
 * Card grid of categories, with their subcategories listed inside each card.
 *
 * The homepage's primary browse affordance. Subcategories are shown as chips
 * *inside* the card rather than behind a click, because the whole point of the
 * grid is to let a visitor scan the full taxonomy at once and jump straight to
 * the leaf they want — one click, not two.
 */

import { Link } from 'react-router-dom';

import type { Category } from '../../types/categories';
import { categoryPath, subcategoryPath } from '../../types/categories';
import { CategoryIcon } from './CategoryIcon';

export function CategoryGrid({
  categories,
  loading = false,
}: {
  categories: Category[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-slate-500">
        No categories are available right now.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {categories.map((category) => (
        <article
          key={category.id}
          className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-brand-400/30"
        >
          <Link to={categoryPath(category.slug)} className="flex items-start gap-3">
            <span className="rounded-xl border border-brand-400/20 bg-brand-500/10 p-2.5 text-brand-300">
              <CategoryIcon name={category.icon} />
            </span>
            <span className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white transition-colors group-hover:text-brand-200">
                {category.name}
              </h3>
              {category.description && (
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  {category.description}
                </p>
              )}
            </span>
          </Link>

          {category.subcategories.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {category.subcategories.map((sub) => (
                <li key={sub.id}>
                  <Link
                    to={subcategoryPath(category.slug, sub.slug)}
                    className="inline-block rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-400 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-brand-200"
                  >
                    {sub.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 border-t border-white/5 pt-3 text-[10px] text-slate-600">
            {category.subcategories.length} sub-categories
            {category.toolCount > 0 && ` · ${category.toolCount} tools`}
          </p>
        </article>
      ))}
    </div>
  );
}
