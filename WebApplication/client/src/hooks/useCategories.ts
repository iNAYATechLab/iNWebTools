/**
 * The category tree, fetched once and shared.
 *
 * The sidebar, the homepage grid and every category page all need the same
 * tree, and several of them mount together. A naive `useEffect` fetch in each
 * would issue four identical requests per navigation, so the promise is cached
 * at module scope and every consumer awaits the same one — the same approach
 * as `useLayout` and `useWidgetConfig`, for the same reason.
 *
 * Failure resolves to an empty tree rather than rejecting: the server already
 * falls back to its seed file, so reaching the catch means the network is down,
 * and the explorer renders an empty state instead of a blank screen.
 */

import { useEffect, useState } from 'react';

import { getCategoryTree } from '../services/api';
import type { Category } from '../types/categories';

let cached: Promise<Category[]> | null = null;

function load(): Promise<Category[]> {
  cached ??= getCategoryTree()
    .then((res) => res.categories)
    .catch(() => []);
  return cached;
}

/** Drop the cache so the next mount refetches — used after an admin save. */
export function invalidateCategories() {
  cached = null;
}

export function useCategories(): { categories: Category[]; loading: boolean } {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    load()
      .then((value) => {
        if (active) setCategories(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { categories, loading };
}
