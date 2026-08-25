import { useEffect, useState } from 'react';

import { getLimits, updateLimits } from '../../../services/adminApi';
import type { LimitsConfig as Limits } from '../../../types/admin';
import { Button, Card, ErrorState, LoadingBlock, PageHeader } from '../components/ui';
import { formatDateTime } from '../components/format';

/** Runtime upload-size limit, bounded by the server's boot-time ceiling. */
export function LimitsConfig() {
  const [config, setConfig] = useState<Limits | null>(null);
  const [value, setValue] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getLimits(controller.signal)
      .then((data) => {
        setConfig(data);
        setValue(data.value.maxUploadSizeMb);
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
      const res = await updateLimits(value);
      setConfig((prev) => (prev ? { ...prev, value: res.value } : prev));
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

  const ceiling = config?.envMaxUploadSizeMb ?? 10;
  const dirty = value !== config?.value.maxUploadSizeMb;

  return (
    <div>
      <PageHeader title="Limits Config" subtitle="Maximum upload size accepted from visitors" />

      {error && <ErrorState message={error} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Upload size limit">
          <label htmlFor="limit-slider" className="mb-2 block text-xs text-slate-400">
            Maximum file size
          </label>

          <div className="flex items-center gap-4">
            <input
              id="limit-slider"
              type="range"
              min={1}
              max={ceiling}
              step={1}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-brand-500"
            />
            <output className="w-20 shrink-0 text-right text-lg font-semibold tabular-nums text-white">
              {value} MB
            </output>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            The server ceiling is <strong className="text-slate-400">{ceiling} MB</strong>, fixed at
            boot by <code className="font-mono">MAX_UPLOAD_SIZE_MB</code>. This control can lower
            the limit but not raise it above the ceiling — multer has already been configured, so a
            higher value would be rejected at upload time anyway.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={() => void save()} disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            {dirty && !saving && (
              <button
                type="button"
                onClick={() => setValue(config?.value.maxUploadSizeMb ?? 10)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Reset
              </button>
            )}
            {saved && <span className="text-xs text-emerald-400">Saved</span>}
          </div>
        </Card>

        <Card title="Current state">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Active limit</dt>
              <dd className="font-medium text-slate-200">{config?.value.maxUploadSizeMb} MB</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Server ceiling</dt>
              <dd className="font-medium text-slate-200">{ceiling} MB</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Last updated</dt>
              <dd className="text-slate-300">{formatDateTime(config?.updatedAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Updated by</dt>
              <dd className="text-slate-300">{config?.updatedBy ?? '—'}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
