import { useLocale } from '../hooks/useLocale';
import type { TranscriptionPhase } from '../types';
import { formatDuration } from '../utils/format';
import { SpinnerIcon } from './icons';

type Props = {
  phase: TranscriptionPhase;
  uploadPercent: number;
  elapsedMs: number;
  onCancel: () => void;
};

/**
 * Real-time progress while transcribing.
 *
 * Upload progress is measurable, so it drives a determinate bar. Model
 * inference is not, so that stage shows an indeterminate shimmer rather than a
 * fake percentage.
 */
export function ProgressLoader({ phase, uploadPercent, elapsedMs, onCancel }: Props) {
  const { t } = useLocale();

  const steps = [
    { id: 'uploading', label: t.progress.uploading },
    { id: 'processing', label: t.progress.processing },
    { id: 'finalizing', label: t.progress.finalizing },
  ] as const;

  const activeIndex = steps.findIndex((s) => s.id === phase);
  const isUploading = phase === 'uploading';
  const headline = steps[activeIndex]?.label ?? t.progress.processing;

  return (
    <div className="a2t-card p-5 sm:p-6" role="status" aria-live="polite">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SpinnerIcon className="h-5 w-5 shrink-0 text-brand-400" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{headline}</p>
            <p className="text-xs text-slate-400">
              {t.progress.elapsed}:{' '}
              <span className="tabular-nums">{formatDuration(elapsedMs)}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300"
        >
          {t.actions.cancel}
        </button>
      </div>

      {/* Progress bar: determinate while uploading, indeterminate afterwards. */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        {...(isUploading ? { 'aria-valuenow': uploadPercent } : {})}
      >
        {isUploading ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400 transition-[width] duration-200 ease-out"
            style={{ width: `${uploadPercent}%` }}
          />
        ) : (
          <div className="a2t-shimmer h-full w-full rounded-full bg-brand-500/30" />
        )}
      </div>

      {isUploading && (
        <p className="mt-1.5 text-right text-[11px] tabular-nums text-slate-400">
          {uploadPercent}%
        </p>
      )}

      {/* Stage checklist */}
      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li key={step.id} className="flex items-center gap-2.5 text-xs">
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors ${
                  done
                    ? 'border-emerald-400 bg-emerald-400 text-ink-900'
                    : active
                      ? 'border-brand-400 bg-brand-400/20'
                      : 'border-white/15'
                }`}
              >
                {done && (
                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" aria-hidden="true">
                    <path
                      d="m5 13 4.5 4.5L19 7"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {active && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />}
              </span>
              <span className={done || active ? 'text-slate-200' : 'text-slate-500'}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 rounded-lg bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-slate-400">
        {t.progress.hint}
      </p>
    </div>
  );
}
