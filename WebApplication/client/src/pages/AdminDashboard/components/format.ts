/**
 * Pure formatting helpers for the dashboard.
 *
 * Separate from ui.tsx so that file exports components only — which keeps
 * react-refresh able to hot-reload it.
 */

export function formatBytes(bytes?: number | null) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDuration(seconds?: number | null) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Flag emoji from an ISO-3166 alpha-2 code, without an image dependency. */
export function flagFor(code?: string | null) {
  if (!code || code.length !== 2 || code === '??') return '🌐';
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map((c) => base + c.charCodeAt(0) - 65),
  );
}
