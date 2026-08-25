import { useEffect, useState } from 'react';

import { getTimeRangeStats } from '../../../services/adminApi';
import type { TimeRange, TimeRangeStats as Stats } from '../../../types/admin';
import { Card, EmptyState, ErrorState, LoadingBlock, PageHeader, StatCard } from '../components/ui';
import { flagFor, formatBytes } from '../components/format';

const RANGES: { id: TimeRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7days', label: 'Last 7 Days' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'alltime', label: 'All Time' },
];

/** Aggregate usage statistics, filtered by period. */
export function TimeRangeStats() {
  const [range, setRange] = useState<TimeRange>('today');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    getTimeRangeStats(range, controller.signal)
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [range]);

  const peak = stats?.timeseries.reduce((max, p) => Math.max(max, p.count), 0) ?? 0;

  return (
    <div>
      <PageHeader title="Time Range Stats" subtitle="Usage aggregated over the selected period" />

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Select a time range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={range === r.id}
            onClick={() => setRange(r.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              range === r.id
                ? 'border-brand-400 bg-brand-500/15 text-white'
                : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} />}
      {loading && <LoadingBlock label="Crunching numbers…" />}

      {!loading && stats && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Conversions" value={stats.totals.conversions} />
            <StatCard
              label="Success rate"
              value={`${stats.totals.successRate}%`}
              tone={
                stats.totals.conversions === 0
                  ? 'default'
                  : stats.totals.successRate >= 95
                    ? 'good'
                    : stats.totals.successRate >= 80
                      ? 'warn'
                      : 'bad'
              }
              hint={`${stats.totals.successes} ok · ${stats.totals.failures} failed`}
            />
            <StatCard label="Unique visitors" value={stats.totals.uniqueVisitors} />
            <StatCard
              label="Avg. duration"
              value={`${(stats.totals.avgDurationMs / 1000).toFixed(1)}s`}
            />
            <StatCard label="Characters" value={stats.totals.characters.toLocaleString()} />
            <StatCard label="Words" value={stats.totals.words.toLocaleString()} />
            <StatCard label="Audio processed" value={formatBytes(stats.totals.bytes)} />
            <StatCard
              label="Failures"
              value={stats.totals.failures}
              tone={stats.totals.failures ? 'bad' : 'default'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              title="Activity"
              description={stats.granularity === 'hour' ? 'By hour' : 'By day'}
            >
              {stats.timeseries.length === 0 ? (
                <EmptyState title="No activity in this period" />
              ) : (
                // A dependency-free bar chart: a charting library would be far
                // more code than a flex row of divs for this shape of data.
                <div className="flex h-40 items-end gap-1" role="img" aria-label="Activity chart">
                  {stats.timeseries.map((point) => {
                    const height = peak ? Math.max((point.count / peak) * 100, 4) : 4;
                    const failed = point.count - point.successes;
                    return (
                      <div
                        key={point.bucket}
                        className="group relative flex-1"
                        style={{ minWidth: 4 }}
                      >
                        <div
                          className={`w-full rounded-t ${failed > 0 ? 'bg-amber-400/70' : 'bg-brand-400/70'} transition-colors group-hover:bg-brand-300`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-200 group-hover:block">
                          {point.bucket.slice(-5)} · {point.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card title="Top languages">
                {stats.byLanguage.length === 0 ? (
                  <EmptyState title="No data yet" />
                ) : (
                  <ul className="space-y-1.5">
                    {stats.byLanguage.map((l) => (
                      <li key={l.language} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{l.language}</span>
                        <span className="tabular-nums text-slate-500">{l.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Top countries">
                {stats.byCountry.length === 0 ? (
                  <EmptyState title="No data yet" />
                ) : (
                  <ul className="space-y-1.5">
                    {stats.byCountry.map((c) => (
                      <li
                        key={c.country_code}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-slate-300">
                          <span className="mr-1.5">{flagFor(c.country_code)}</span>
                          {c.country_code}
                        </span>
                        <span className="tabular-nums text-slate-500">{c.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
