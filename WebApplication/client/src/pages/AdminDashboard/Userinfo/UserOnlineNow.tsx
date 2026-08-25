import { useCallback, useEffect, useState } from 'react';

import { getOnlineNow, getSessionDetail } from '../../../services/adminApi';
import type { OnlineNowResponse, SessionDetail } from '../../../types/admin';
import {
  Badge,
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
import { flagFor, formatDateTime, formatDuration } from '../components/format';

const REFRESH_MS = 15_000;

/** Live connected users, with a modal inspector for a single session. */
export function UserOnlineNow() {
  const [data, setData] = useState<OnlineNowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setData(await getOnlineNow(signal));
      setError(null);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll so "online now" stays true without a websocket.
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);

  const openSession = async (sessionId: string) => {
    setDetailLoading(true);
    try {
      setSelected(await getSessionDetail(sessionId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading live sessions…" />;

  return (
    <div>
      <PageHeader
        title="User Online Now"
        subtitle={
          data ? `Sessions active in the last ${Math.round(data.windowSeconds / 60)} minutes` : ''
        }
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live · refreshes every {REFRESH_MS / 1000}s
          </span>
        }
      />

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {data && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Online" value={data.summary.onlineTotal} tone="good" />
            <StatCard label="Desktop" value={data.summary.desktop} />
            <StatCard label="Mobile" value={data.summary.mobile} />
            <StatCard label="Tablet" value={data.summary.tablet} />
            <StatCard label="Countries" value={data.summary.countries} />
          </div>

          {!data.geoLookupEnabled && (
            <p className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Geo lookup is disabled, so Country and ISP stay empty. Set{' '}
              <code className="font-mono">GEO_LOOKUP_ENABLED=true</code> to enable it — visitor IPs
              are then sent to a third-party service.
            </p>
          )}

          <Card>
            {data.sessions.length === 0 ? (
              <EmptyState
                title="Nobody is online right now"
                hint="Sessions appear here as soon as someone opens the app."
              />
            ) : (
              <TableWrap>
                <table className="min-w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr>
                      <Th>IP address</Th>
                      <Th>Device</Th>
                      <Th>Browser / OS</Th>
                      <Th>Country</Th>
                      <Th>ISP</Th>
                      <Th>Views</Th>
                      <Th>Last seen</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.sessions.map((s) => (
                      <tr key={s.session_id} className="hover:bg-white/[0.02]">
                        <Td className="font-mono text-xs">{s.ip_address}</Td>
                        <Td>
                          <Badge tone={s.device_type === 'bot' ? 'warn' : 'neutral'}>
                            {s.device_type ?? 'unknown'}
                          </Badge>
                        </Td>
                        <Td className="text-xs">
                          {s.browser} <span className="text-slate-500">/ {s.os}</span>
                        </Td>
                        <Td className="text-xs">
                          {s.country ? (
                            <>
                              <span className="mr-1">{flagFor(s.country_code)}</span>
                              {s.country}
                            </>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </Td>
                        <Td className="max-w-[160px] truncate text-xs">
                          {s.isp ?? <span className="text-slate-600">—</span>}
                        </Td>
                        <Td className="tabular-nums">{s.page_views}</Td>
                        <Td className="text-xs text-slate-400">
                          {s.seconds_since_seen != null
                            ? `${formatDuration(s.seconds_since_seen)} ago`
                            : formatDateTime(s.last_seen_at)}
                        </Td>
                        <Td>
                          <button
                            type="button"
                            onClick={() => void openSession(s.session_id)}
                            className="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5"
                          >
                            Inspect
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </>
      )}

      {(selected || detailLoading) && (
        <SessionModal
          detail={selected}
          loading={detailLoading}
          onClose={() => {
            setSelected(null);
            setDetailLoading(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Modal inspector ---------------- */

function SessionModal({
  detail,
  loading,
  onClose,
}: {
  detail: SessionDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  // Escape closes, matching what a keyboard user expects from a dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const s = detail?.session;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Session details"
        className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white/10 bg-slate-900 p-5 sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Session inspector</h2>
            {s && <p className="mt-0.5 font-mono text-[11px] text-slate-500">{s.session_id}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {loading && <LoadingBlock label="Loading session…" />}

        {s && (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Field label="IP address" value={s.ip_address} mono />
              <Field label="Device" value={s.device_type ?? '—'} />
              <Field label="Browser" value={s.browser ?? '—'} />
              <Field label="Operating system" value={s.os ?? '—'} />
              <Field
                label="Country"
                value={s.country ? `${flagFor(s.country_code)} ${s.country}` : '—'}
              />
              <Field label="City" value={s.city ?? '—'} />
              <Field label="ISP" value={s.isp ?? '—'} />
              <Field label="Page views" value={String(s.page_views)} />
              <Field label="Session length" value={formatDuration(s.session_seconds)} />
              <Field label="First seen" value={formatDateTime(s.first_seen_at)} />
              <Field label="Last seen" value={formatDateTime(s.last_seen_at)} />
              <Field label="Geo status" value={s.geo_status} />
            </dl>

            {s.user_agent && (
              <div className="mt-4">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  User agent
                </p>
                <p className="break-all rounded-lg border border-white/10 bg-white/[0.02] p-2.5 font-mono text-[11px] text-slate-400">
                  {s.user_agent}
                </p>
              </div>
            )}

            <div className="mt-5">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Transcriptions in this session ({detail?.conversions.length ?? 0})
              </p>
              {detail && detail.conversions.length > 0 ? (
                <ul className="space-y-1.5">
                  {detail.conversions.map((c) => (
                    <li
                      key={c.request_id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs"
                    >
                      <span className="truncate text-slate-300">{c.file_name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge tone={c.status === 'success' ? 'good' : 'bad'}>{c.status}</Badge>
                        <span className="text-slate-500">{formatDateTime(c.created_at)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-600">No transcriptions from this visitor yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 truncate text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
