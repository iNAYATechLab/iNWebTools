import { useEffect, useState, type FormEvent } from 'react';

import { changePassword, getAdminAccess } from '../../../services/adminApi';
import type { AdminAccessResponse } from '../../../types/admin';
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
import { formatDateTime } from '../components/format';
import { useAdminAuth } from '../../../hooks/useAdminAuth';

/**
 * Used only until the server's value arrives. The API is authoritative — this
 * form must never advertise a rule stricter or looser than what is enforced.
 */
const MIN_PASSWORD_FALLBACK = 6;

/** Admin accounts, audit trail, and self-service password change. */
export function AdminAccess() {
  const { user } = useAdminAuth();
  const [data, setData] = useState<AdminAccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  // The server owns this rule; fall back only until its value has loaded.
  const minPassword = data?.posture.minPasswordLength ?? MIN_PASSWORD_FALLBACK;

  useEffect(() => {
    const controller = new AbortController();
    getAdminAccess(controller.signal)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setPwError(null);
    setPwDone(false);

    if (next.length < minPassword) {
      setPwError(`Use at least ${minPassword} characters.`);
      return;
    }
    if (next !== confirm) {
      setPwError('The two new passwords do not match.');
      return;
    }

    setPwBusy(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setPwDone(true);
    } catch (err) {
      setPwError((err as Error).message);
    } finally {
      setPwBusy(false);
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <div>
      <PageHeader title="Admin Access" subtitle="Accounts, credentials and the audit trail" />

      {error && <ErrorState message={error} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Change your password" description={`Signed in as ${user?.username ?? '—'}`}>
          <form onSubmit={submitPassword} className="space-y-3">
            <Field
              id="pw-current"
              label="Current password"
              value={current}
              autoComplete="current-password"
              onChange={setCurrent}
            />
            <Field
              id="pw-next"
              label={`New password (min ${minPassword} characters)`}
              value={next}
              autoComplete="new-password"
              onChange={setNext}
            />
            <Field
              id="pw-confirm"
              label="Repeat new password"
              value={confirm}
              autoComplete="new-password"
              onChange={setConfirm}
            />

            {pwError && (
              <p
                role="alert"
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
              >
                {pwError}
              </p>
            )}
            {pwDone && (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                Password updated. Existing sessions stay valid until their tokens expire.
              </p>
            )}

            <Button type="submit" disabled={pwBusy || !current || !next}>
              {pwBusy ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </Card>

        <Card title="Administrator accounts">
          {data && data.admins.length > 0 ? (
            <ul className="space-y-2">
              {data.admins.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {a.username}
                      {a.username === user?.username && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-brand-400">
                          you
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Last login {formatDateTime(a.last_login_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Badge tone="neutral">{a.role}</Badge>
                    <Badge tone={a.is_active ? 'good' : 'bad'}>
                      {a.is_active ? 'active' : 'disabled'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No accounts found" />
          )}

          <p className="mt-3 text-[11px] text-slate-500">
            Accounts are provisioned server-side. The bootstrap owner is created from{' '}
            <code className="font-mono">ADMIN_BOOTSTRAP_USERNAME</code> on first start.
          </p>
        </Card>
      </div>

      {data && (
        <div className="mt-4">
          <Card
            title="Security posture"
            description="How authentication is configured on this server"
          >
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
              <Posture
                label="JWT secret"
                value={data.posture.jwtConfigured ? 'Configured' : 'Not configured'}
                tone={data.posture.jwtConfigured ? 'good' : 'bad'}
              />
              <Posture
                label="Failed logins (24h)"
                value={String(data.posture.failedLogins24h)}
                tone={data.posture.failedLogins24h > 0 ? 'warn' : 'good'}
              />
              <Posture label="Access token" value={`${data.posture.accessTokenTtlMinutes} min`} />
              <Posture label="Refresh token" value={`${data.posture.refreshTokenTtlDays} days`} />
              <Posture
                label="Login throttle"
                value={`${data.posture.loginMaxAttempts} / ${data.posture.loginWindowMinutes} min`}
              />
              <Posture
                label="Geo lookup"
                value={data.posture.geoLookupEnabled ? 'Enabled' : 'Disabled'}
                tone={data.posture.geoLookupEnabled ? 'warn' : 'good'}
              />
            </dl>

            {data.posture.geoLookupEnabled && (
              <p className="mt-3 text-[11px] text-amber-200/80">
                Visitor IP addresses are sent to a third-party service to resolve location. Private
                and loopback addresses are always skipped.
              </p>
            )}
          </Card>
        </div>
      )}

      <div className="mt-4">
        <Card title="Audit trail" description="Recent privileged actions">
          {data && data.auditLog.length > 0 ? (
            <TableWrap>
              <table className="min-w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <Th>When</Th>
                    <Th>Actor</Th>
                    <Th>Action</Th>
                    <Th>Detail</Th>
                    <Th>IP</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.auditLog.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/[0.02]">
                      <Td className="text-xs text-slate-400">{formatDateTime(entry.created_at)}</Td>
                      <Td className="text-xs text-slate-300">{entry.username ?? 'system'}</Td>
                      <Td>
                        <Badge tone={entry.action.includes('failed') ? 'bad' : 'neutral'}>
                          {entry.action}
                        </Badge>
                      </Td>
                      <Td className="max-w-[240px] truncate text-xs text-slate-400">
                        {entry.detail ?? '—'}
                      </Td>
                      <Td className="font-mono text-[11px] text-slate-500">
                        {entry.ip_address ?? '—'}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <EmptyState title="No audit entries yet" />
          )}
        </Card>
      </div>
    </div>
  );
}

function Posture({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const tones = {
    default: 'text-slate-200',
    good: 'text-emerald-300',
    warn: 'text-amber-300',
    bad: 'text-rose-300',
  };
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 font-medium ${tones[tone]}`}>{value}</dd>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 focus:border-brand-400 focus:outline-none"
      />
    </div>
  );
}
