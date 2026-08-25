/**
 * Recent Transcriptions widget — this visitor's own history.
 *
 * The data is read from localStorage, not the server: transcription does not
 * require an account, so there is no user to key server-side rows against for
 * an anonymous visitor, and keeping transcript text in the browser matches the
 * privacy posture of the upload path (the audio file is deleted immediately).
 *
 * `useSyncExternalStore` rather than `useState` + an effect: the store lives
 * outside React and can change from another tab, and this is exactly the hook
 * built for that — it subscribes, re-reads, and stays consistent under
 * concurrent rendering without a manual event dance.
 */

import { useCallback, useSyncExternalStore } from 'react';

import {
  clearHistory,
  readHistory,
  subscribeToHistory,
  type HistoryEntry,
} from '../../services/transcriptionHistory';
import type { WidgetInstance } from '../../types/widgets';
import { WidgetShell } from './WidgetShell';

/**
 * Cached snapshot.
 *
 * `useSyncExternalStore` requires getSnapshot to return a referentially stable
 * value when nothing changed — returning a fresh array each call would spin
 * the render loop. The cache is refreshed only when the store notifies.
 */
let snapshot: HistoryEntry[] = [];
let snapshotRaw = '';

function getSnapshot(): HistoryEntry[] {
  const entries = readHistory();
  const raw = JSON.stringify(entries.map((e) => e.id));
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshot = entries;
  }
  return snapshot;
}

/** The server never renders this, so an empty list is the right SSR snapshot. */
const getServerSnapshot = (): HistoryEntry[] => [];

/** "3m ago", "2h ago", "5d ago". */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RecentTranscriptionsWidget({ widget }: { widget: WidgetInstance }) {
  const maxItems = Number(widget.settings.maxItems ?? 5);
  const showPreview = Boolean(widget.settings.showPreview);
  const emptyText = String(widget.settings.emptyText ?? '');

  const entries = useSyncExternalStore(subscribeToHistory, getSnapshot, getServerSnapshot);
  const visible = entries.slice(0, maxItems);

  const handleClear = useCallback(() => clearHistory(), []);

  if (visible.length === 0) {
    return (
      <WidgetShell title={widget.title}>
        <p className="text-xs leading-relaxed text-slate-600">{emptyText}</p>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title={widget.title}>
      <ul className="space-y-2.5">
        {visible.map((entry) => (
          <li key={entry.id} className="border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-xs font-medium text-slate-300" title={entry.fileName}>
                {entry.fileName}
              </p>
              <span className="shrink-0 text-[10px] text-slate-600">
                {relativeTime(entry.createdAt)}
              </span>
            </div>

            {showPreview && entry.preview && (
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                {entry.preview}
              </p>
            )}

            <p className="mt-1 text-[10px] text-slate-600">
              {entry.words.toLocaleString()} words · {entry.language}
            </p>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleClear}
        className="mt-3 w-full rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-slate-500 transition-colors hover:border-white/20 hover:text-slate-300"
      >
        Clear history
      </button>
    </WidgetShell>
  );
}
