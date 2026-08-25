/**
 * Polled public stats for the live sidebar widgets.
 *
 * Two widget types (Live Online Users, System Stats) want the same numbers on
 * their own refresh intervals. Polling independently would double the request
 * rate for one payload, so a single module-scope poller fans out to every
 * subscriber and runs at the *shortest* interval any of them asked for.
 *
 * The poll pauses while the tab is hidden. A background tab that keeps hitting
 * the server every 30 seconds for numbers nobody is looking at is pure waste,
 * and it inflates the very "online now" figure it is fetching.
 */

import { useEffect, useState } from 'react';

import { getWidgetPublicStats } from '../services/api';
import type { WidgetPublicStats } from '../types/widgets';

type Subscriber = {
  intervalMs: number;
  notify: (stats: WidgetPublicStats | null) => void;
};

const subscribers = new Set<Subscriber>();
let timer: ReturnType<typeof setTimeout> | null = null;
let latest: WidgetPublicStats | null = null;
let inFlight: Promise<void> | null = null;

/** Shortest interval any subscriber asked for, with a floor to be polite. */
function currentIntervalMs(): number {
  let shortest = Number.POSITIVE_INFINITY;
  for (const sub of subscribers) shortest = Math.min(shortest, sub.intervalMs);
  return Number.isFinite(shortest) ? Math.max(10_000, shortest) : 60_000;
}

function broadcast() {
  for (const sub of subscribers) sub.notify(latest);
}

async function fetchOnce() {
  // Collapse concurrent triggers (a new subscriber mounting mid-poll) into one
  // request rather than racing two.
  inFlight ??= getWidgetPublicStats()
    .then((stats) => {
      latest = stats;
      broadcast();
    })
    .catch(() => {
      // Keep the last good numbers on a transient failure; a flicker to "—"
      // on one dropped request is worse than slightly stale data.
      if (latest === null) broadcast();
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

function schedule() {
  if (timer !== null) clearTimeout(timer);
  if (subscribers.size === 0) {
    timer = null;
    return;
  }

  timer = setTimeout(() => {
    // Skip the round trip entirely while nobody can see the result.
    if (typeof document !== 'undefined' && document.hidden) {
      schedule();
      return;
    }
    void fetchOnce().finally(schedule);
  }, currentIntervalMs());
}

/**
 * Subscribe to the shared stats poll.
 *
 * @param refreshSeconds How often *this* consumer wants fresh numbers. The
 *   poller runs at the shortest interval across all subscribers.
 */
export function useWidgetStats(refreshSeconds: number): {
  stats: WidgetPublicStats | null;
  loading: boolean;
} {
  const [stats, setStats] = useState<WidgetPublicStats | null>(latest);
  const [loading, setLoading] = useState(latest === null);

  useEffect(() => {
    const subscriber: Subscriber = {
      intervalMs: Math.max(10_000, refreshSeconds * 1000),
      notify: (next) => {
        setStats(next);
        setLoading(false);
      },
    };

    subscribers.add(subscriber);

    // A late subscriber gets the cached value immediately rather than waiting
    // out a full interval with an empty widget.
    if (latest !== null) {
      setStats(latest);
      setLoading(false);
    } else {
      void fetchOnce();
    }

    schedule();

    // Catch up straight away when the tab comes back, since the poll paused.
    const onVisible = () => {
      if (!document.hidden) void fetchOnce();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      subscribers.delete(subscriber);
      document.removeEventListener('visibilitychange', onVisible);
      schedule();
    };
  }, [refreshSeconds]);

  return { stats, loading };
}
