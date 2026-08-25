import { useEffect, useState } from 'react';

import { getConversions } from '../../../services/adminApi';
import type { ConversionLog, Pagination } from '../../../types/admin';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  TableWrap,
  Td,
  Th,
} from '../components/ui';
import { flagFor, formatBytes, formatDateTime } from '../components/format';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'success', label: 'Successful' },
  { id: 'failed', label: 'Failed' },
];

/** Paged history of every transcription request. */
export function ConversionHistory() {
  const [items, setItems] = useState<ConversionLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        setLoading(true);
        getConversions({ page, limit: 25, status, search }, controller.signal)
          .then((data) => {
            setItems(data.items);
            setPagination(data.pagination);
            setError(null);
          })
          .catch((err) => {
            if (err.name !== 'AbortError') setError(err.message);
          })
          .finally(() => setLoading(false));
      },
      search ? 300 : 0,
    );

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [page, status, search]);

  return (
    <div>
      <PageHeader
        title="Conversion History"
        subtitle="Every transcription request, successful or failed"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={status === f.id}
              onClick={() => {
                setStatus(f.id);
                setPage(1);
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                status === f.id
                  ? 'border-brand-400 bg-brand-500/15 text-white'
                  : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search file, request id or IP…"
          aria-label="Search conversions"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-brand-400 focus:outline-none sm:w-72"
        />
      </div>

      {error && <ErrorState message={error} />}

      <Card>
        {loading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState
            title="No conversions found"
            hint={search ? 'Try a different search term.' : 'Transcriptions will appear here.'}
          />
        ) : (
          <TableWrap>
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  <Th>When</Th>
                  <Th>File</Th>
                  <Th>Size</Th>
                  <Th>Lang</Th>
                  <Th>Status</Th>
                  <Th>Chars</Th>
                  <Th>Time</Th>
                  <Th>Origin</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((c) => (
                  <tr key={c.request_id} className="align-top hover:bg-white/[0.02]">
                    <Td className="text-xs text-slate-400">{formatDateTime(c.created_at)}</Td>
                    <Td className="max-w-[200px]">
                      <span className="block truncate text-slate-200">{c.file_name ?? '—'}</span>
                      {c.transcript_sample && (
                        <span className="mt-0.5 block max-w-[200px] truncate text-[11px] text-slate-500">
                          {c.transcript_sample}
                        </span>
                      )}
                    </Td>
                    <Td className="text-xs">{formatBytes(c.file_size_bytes)}</Td>
                    <Td className="text-xs">{c.language ?? 'auto'}</Td>
                    <Td>
                      {c.status === 'success' ? (
                        <Badge tone="good">success</Badge>
                      ) : (
                        <Badge tone="bad">{c.error_code ?? 'failed'}</Badge>
                      )}
                    </Td>
                    <Td className="tabular-nums text-xs">{c.characters ?? '—'}</Td>
                    <Td className="tabular-nums text-xs">
                      {c.duration_ms ? `${(c.duration_ms / 1000).toFixed(1)}s` : '—'}
                    </Td>
                    <Td className="font-mono text-[11px] text-slate-500">
                      {flagFor(c.country_code)} {c.ip_address ?? '—'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.pages} · {pagination.total} records
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= pagination.pages}
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
