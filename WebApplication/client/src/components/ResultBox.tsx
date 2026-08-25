import { useCallback, useEffect, useRef, useState } from 'react';

import { useLocale } from '../hooks/useLocale';
import type { TranscriptionResult } from '../types';
import { baseName, formatDuration } from '../utils/format';
import { CheckIcon, CopyIcon, DownloadIcon, SparkleIcon } from './icons';

type Props = {
  result: TranscriptionResult | null;
  durationMs: number | null;
};

export function ResultBox({ result, durationMs }: Props) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);
  // Blob URLs pending revocation, so an unmount mid-download cannot leak them.
  const pendingUrls = useRef<Set<string>>(new Set());

  useEffect(
    () => () => {
      window.clearTimeout(resetTimer.current);
      pendingUrls.current.forEach((url) => URL.revokeObjectURL(url));
      pendingUrls.current.clear();
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
    } catch {
      // Clipboard API needs a secure context; fall back to a temp textarea.
      const area = document.createElement('textarea');
      area.value = result.text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result?.text) return;
    const blob = new Blob([result.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName(result.file.name) || 'transcript'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Give the browser a tick to start the download before revoking.
    pendingUrls.current.add(url);
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      pendingUrls.current.delete(url);
    }, 1000);
  }, [result]);

  /* ------------------------------ empty ------------------------------- */
  if (!result) {
    return (
      <div className="a2t-card flex min-h-[280px] flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-slate-500">
          <SparkleIcon className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium text-slate-300">{t.result.empty}</p>
        <p className="max-w-xs text-xs text-slate-500">{t.result.emptyHint}</p>
      </div>
    );
  }

  /* ----------------------------- populated ----------------------------- */
  return (
    <div className="a2t-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <CheckIcon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">{t.result.title}</h3>
            <p className="text-[11px] tabular-nums text-slate-400">
              {result.words} {t.result.words} · {result.characters} {t.result.characters}
              {durationMs != null && (
                <>
                  {' '}
                  · {t.result.duration} {formatDuration(durationMs)}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              copied
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                : 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5 hover:text-white'
            }`}
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
            {copied ? t.result.copied : t.result.copy}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-brand-500/25 transition-colors hover:bg-brand-600"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            {t.result.download}
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto px-4 py-4 sm:px-5">
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-100">
          {result.text || '—'}
        </p>
      </div>

      <div className="border-t border-white/5 px-4 py-2 sm:px-5">
        <p className="truncate text-[11px] text-slate-500" title={result.model}>
          {result.file.name} · {result.model}
        </p>
      </div>
    </div>
  );
}
