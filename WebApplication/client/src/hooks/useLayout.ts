/**
 * Live header/footer layout, fetched once and shared.
 *
 * Header and Footer are siblings, so a naive `useEffect` fetch in each would
 * issue two identical requests on every page load. The promise is cached at
 * module scope and both components await the same one.
 *
 * Failure is deliberately silent: the layout falls back to defaults and the
 * site renders normally. A CMS outage must never blank the page.
 */

import { useEffect, useState } from 'react';

import { getLayout } from '../services/api';
import { DEFAULT_LAYOUT, type LayoutConfig } from '../types/layout';

let cached: Promise<LayoutConfig> | null = null;

function load(): Promise<LayoutConfig> {
  cached ??= getLayout()
    .then((res) => res.value)
    .catch(() => DEFAULT_LAYOUT);
  return cached;
}

/** Drop the cache so the next mount refetches — used after an admin save. */
export function invalidateLayout() {
  cached = null;
}

export function useLayout(): { layout: LayoutConfig; loading: boolean } {
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    load()
      .then((value) => {
        if (active) setLayout(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { layout, loading };
}
