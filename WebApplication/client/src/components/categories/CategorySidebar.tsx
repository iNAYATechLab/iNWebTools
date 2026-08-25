/**
 * Category navigation sidebar.
 *
 * An accordion rather than a flat list: 8 categories with 25 subcategories
 * between them is far too much to show at once in a column, and a flat list
 * would bury the category the visitor is actually in.
 *
 * The group holding the current route is expanded automatically and stays
 * expandable by hand. Deriving open state purely from the URL would collapse a
 * group the moment someone clicked away; keeping it purely in state would mean
 * arriving at a deep link with everything shut. The `useEffect` below merges
 * both: the route opens its own group, and manual toggles persist on top.
 */

import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';

import { useCategories } from '../../hooks/useCategories';
import { categoryPath, subcategoryPath } from '../../types/categories';
import { CategoryIcon } from './CategoryIcon';

export function CategorySidebar({ className = '' }: { className?: string }) {
  const { categorySlug } = useParams();
  const { categories, loading } = useCategories();
  const [open, setOpen] = useState<Set<string>>(new Set());

  // Open the group matching the current route, without closing anything the
  // visitor opened themselves.
  useEffect(() => {
    if (!categorySlug) return;
    setOpen((current) => {
      if (current.has(categorySlug)) return current;
      const next = new Set(current);
      next.add(categorySlug);
      return next;
    });
  }, [categorySlug]);

  const toggle = (slug: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  if (loading) {
    return (
      <nav className={className} aria-label="Tool categories">
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className={className} aria-label="Tool categories">
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Browse by category
      </p>

      <ul className="space-y-0.5">
        {categories.map((category) => {
          const isOpen = open.has(category.slug);
          const panelId = `cat-panel-${category.slug}`;

          return (
            <li key={category.id}>
              <div className="flex items-stretch gap-0.5">
                {/*
                  Two controls, deliberately separate: the label navigates to
                  the category page, the chevron expands the group. Merging
                  them would make it impossible to reach the category's own
                  landing page — clicking would only ever toggle.
                */}
                <NavLink
                  to={categoryPath(category.slug)}
                  className={({ isActive }) =>
                    `flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-brand-500/15 font-medium text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`
                  }
                >
                  <CategoryIcon name={category.icon} className="h-4 w-4 shrink-0" />
                  <span className="truncate">{category.name}</span>
                  {category.toolCount > 0 && (
                    <span className="ml-auto shrink-0 text-[10px] tabular-nums text-slate-600">
                      {category.toolCount}
                    </span>
                  )}
                </NavLink>

                {category.subcategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggle(category.slug)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${category.name}`}
                    className="shrink-0 rounded-lg px-1.5 text-slate-600 transition-colors hover:bg-white/5 hover:text-slate-300"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L10.94 10 7.22 6.28a.75.75 0 0 1 0-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {isOpen && category.subcategories.length > 0 && (
                <ul id={panelId} className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                  {category.subcategories.map((sub) => (
                    <li key={sub.id}>
                      <NavLink
                        to={subcategoryPath(category.slug, sub.slug)}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                            isActive
                              ? 'bg-brand-500/10 font-medium text-brand-200'
                              : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                          }`
                        }
                      >
                        <span className="truncate">{sub.name}</span>
                        {sub.toolCount > 0 && (
                          <span className="ml-auto shrink-0 text-[10px] tabular-nums text-slate-600">
                            {sub.toolCount}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
