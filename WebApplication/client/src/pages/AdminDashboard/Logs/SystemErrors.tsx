import { Fragment, useCallback, useEffect, useState } from 'react';

import { getSystemErrors, resolveSystemError } from '../../../services/adminApi';
import type { SystemErrorsResponse } from '../../../types/admin';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  StatCard,
  TableWrap,
  Td,
  Th,
} from '../components/ui';
import { formatDateTime } from '../components/format';

const LEVELS = [
  { id: 'all', label: 'All levels' },
  { id: 'fatal', label: 'Fatal' },
  { id: 'error', label: 'Error' },
  { id: 'warn', label: 'Warning' },
];

/** API and backend error events, with a resolve toggle. */
export function SystemErrors() {
  const [data, setData] = useState<SystemErrorsResponse | null>(null);
  const [level, setLevel] = useState('all');
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setData(
          await getSystemErrors({ page, limit: 25, level, unresolved: unresolvedOnly }, signal),
        );
        setError(null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [page, level, unresolvedOnly],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const toggleResolved = async (id: number, current: string | null) => {
    try {
      await resolveSystemError(id, current === null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <PageHeader
        title="System Errors"
        subtitle="API and backend faults worth an operator's attention"
      />

      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Unresolved"
            value={data.summary.unresolved}
            tone={data.summary.unresolved ? 'bad' : 'good'}
          />
          <StatCard
            label="Fatal"
            value={data.summary.fatal}
            tone={data.summary.fatal ? 'bad' : 'default'}
          />
          <StatCard
            label="Error"
            value={data.summary.error}
            tone={data.summary.error ? 'warn' : 'default'}
          />
          <StatCard label="Warning" value={data.summary.warn} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={level === l.id}
            onClick={() => {
              setLevel(l.id);
              setPage(1);
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              level === l.id
                ? 'border-brand-400 bg-brand-500/15 text-white'
                : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
            }`}
          >
            {l.label}
          </button>
        ))}

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={unresolvedOnly}
            onChange={(e) => {
              setUnresolvedOnly(e.target.checked);
              setPage(1);
            }}
            className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-brand-500"
          />
          Unresolved only
        </label>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <Card>
        {loading ? (
          <LoadingBlock />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No errors recorded"
            hint="A healthy system. Faults appear here automatically."
          />
        ) : (
          <TableWrap>
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  <Th>When</Th>
                  <Th>Level</Th>
                  <Th>Code</Th>
                  <Th>Route</Th>
                  <Th>Status</Th>
                  <Th>State</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.items.map((e) => (
                  <Fragment key={e.id}>
                    <tr className="hover:bg-white/[0.02]">
                      <Td className="text-xs text-slate-400">{formatDateTime(e.created_at)}</Td>
                      <Td>
                        <Badge
                          tone={
                            e.level === 'fatal' ? 'bad' : e.level === 'error' ? 'warn' : 'neutral'
                          }
                        >
                          {e.level}
                        </Badge>
                      </Td>
                      <Td className="font-mono text-xs text-slate-300">{e.code}</Td>
                      <Td className="max-w-[200px] truncate text-xs">
                        <span className="text-slate-500">{e.method}</span> {e.route}
                      </Td>
                      <Td className="tabular-nums text-xs">{e.http_status ?? '—'}</Td>
                      <Td>
                        {e.resolved_at ? (
                          <Badge tone="good">resolved</Badge>
                        ) : (
                          <Badge tone="warn">open</Badge>
                        )}
                      </Td>
                      <Td>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                          >
                            {expanded === e.id ? 'Hide' : 'Details'}
                          </Button>
                          <Button
                            size="sm"
                            variant={e.resolved_at ? 'ghost' : 'primary'}
                            onClick={() => void toggleResolved(e.id, e.resolved_at)}
                          >
                            {e.resolved_at ? 'Reopen' : 'Resolve'}
                          </Button>
                        </div>
                      </Td>
                    </tr>
                    {expanded === e.id && (
                      <tr>
                        <td colSpan={7} className="px-3 pb-3">
                          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                            <p className="text-xs text-slate-300">{e.message}</p>
                            <p className="mt-2 font-mono text-[11px] text-slate-500">
                              request {e.request_id ?? '—'} · ip {e.ip_address ?? '—'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}

        {data && data.pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <p className="text-xs text-slate-500">
              Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total}{' '}
              records
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
