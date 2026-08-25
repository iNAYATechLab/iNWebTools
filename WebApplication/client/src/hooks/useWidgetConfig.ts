/**
 * Live sidebar widget configuration, fetched once and shared.
 *
 * Both sidebars mount as siblings, so a naive `useEffect` fetch in each would
 * issue two identical requests on every page load. The promise is cached at
 * module scope and every consumer awaits the same one — the same approach as
 * `useLayout`, for the same reason.
 *
 * Failure is deliberately quiet: the sidebars fall back to empty and the page
 * renders normally. A widget outage must never blank the transcriber.
 */

import { useEffect, useState } from 'react';

import { getWidgetConfig } from '../services/api';
import { EMPTY_WIDGET_CONFIG, type WidgetConfig } from '../types/widgets';

let cached: Promise<WidgetConfig> | null = null;

function load(): Promise<WidgetConfig> {
  cached ??= getWidgetConfig()
    .then((res) => res.value)
    .catch(() => EMPTY_WIDGET_CONFIG);
  return cached;
}

/** Drop the cache so the next mount refetches — used after an admin save. */
export function invalidateWidgetConfig() {
  cached = null;
}

export function useWidgetConfig(): { config: WidgetConfig; loading: boolean } {
  const [config, setConfig] = useState<WidgetConfig>(EMPTY_WIDGET_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    load()
      .then((value) => {
        if (active) setConfig(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { config, loading };
}
