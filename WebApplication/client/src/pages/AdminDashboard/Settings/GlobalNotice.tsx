import { useEffect, useState } from 'react';

import { getNotice, updateNotice } from '../../../services/adminApi';
import type { GlobalNotice as Notice } from '../../../types/admin';
import { Button, Card, ErrorState, LoadingBlock, PageHeader } from '../components/ui';
import { formatDateTime } from '../components/format';

const VARIANTS = [
  { id: 'info', label: 'Info', classes: 'border-sky-400/30 bg-sky-500/10 text-sky-200' },
  {
    id: 'warning',
    label: 'Warning',
    classes: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  },
  { id: 'critical', label: 'Critical', classes: 'border-rose-400/30 bg-rose-500/10 text-rose-200' },
] as const;

/** Site-wide banner controller, with a live preview in both languages. */
export function GlobalNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [form, setForm] = useState<Notice['value']>({
    enabled: false,
    message: '',
    messageBn: '',
    variant: 'info',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getNotice(controller.signal)
      .then((data) => {
        setNotice(data);
        setForm(data.value);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await updateNotice(form);
      setNotice((prev) => (prev ? { ...prev, value: res.value } : prev));
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock />;

  const variantClasses =
    VARIANTS.find((v) => v.id === form.variant)?.classes ?? VARIANTS[0].classes;

  return (
    <div>
      <PageHeader title="Global Notice" subtitle="A banner shown to every visitor of the app" />

      {error && <ErrorState message={error} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Compose">
          <label className="mb-4 flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm text-slate-200">Show the banner</span>
              <span className="block text-[11px] text-slate-500">
                Takes effect immediately for all visitors
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-brand-500"
            />
          </label>

          <div className="mb-3">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">Severity</span>
            <div className="flex gap-2">
              {VARIANTS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={form.variant === v.id}
                  onClick={() => setForm({ ...form, variant: v.id })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.variant === v.id
                      ? v.classes
                      : 'border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="notice-en" className="mb-1.5 block text-xs font-medium text-slate-400">
              Message (English)
            </label>
            <textarea
              id="notice-en"
              rows={2}
              maxLength={500}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Scheduled maintenance on Sunday 02:00–04:00 UTC."
              className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-brand-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="notice-bn" className="mb-1.5 block text-xs font-medium text-slate-400">
              Message (বাংলা)
            </label>
            <textarea
              id="notice-bn"
              rows={2}
              maxLength={500}
              value={form.messageBn}
              onChange={(e) => setForm({ ...form, messageBn: e.target.value })}
              placeholder="রবিবার ০২:০০–০৪:০০ UTC রক্ষণাবেক্ষণ চলবে।"
              className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-brand-400 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save notice'}
            </Button>
            {saved && <span className="text-xs text-emerald-400">Saved</span>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Preview" description="How visitors will see it">
            {form.enabled && (form.message || form.messageBn) ? (
              <div className="space-y-2">
                {form.message && (
                  <div className={`rounded-xl border px-3 py-2 text-sm ${variantClasses}`}>
                    {form.message}
                  </div>
                )}
                {form.messageBn && (
                  <div className={`rounded-xl border px-3 py-2 text-sm ${variantClasses}`}>
                    {form.messageBn}
                  </div>
                )}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-slate-600">
                {form.enabled
                  ? 'Add a message in at least one language.'
                  : 'The banner is currently hidden.'}
              </p>
            )}
          </Card>

          <Card title="Status">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Currently</dt>
                <dd className={notice?.value.enabled ? 'text-emerald-300' : 'text-slate-400'}>
                  {notice?.value.enabled ? 'Visible' : 'Hidden'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Last updated</dt>
                <dd className="text-slate-300">{formatDateTime(notice?.updatedAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Updated by</dt>
                <dd className="text-slate-300">{notice?.updatedBy ?? '—'}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
