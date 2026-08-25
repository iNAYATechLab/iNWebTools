/**
 * System Stats widget — active model, uptime and transcription volume.
 *
 * Shares the same poll as the online-users widget. Every field is individually
 * toggleable from the admin editor, so an operator can show the model name to
 * build trust without publishing throughput numbers, or vice versa.
 */

import { useWidgetStats } from '../../hooks/useWidgetStats';
import type { WidgetInstance } from '../../types/widgets';
import { WidgetRow, WidgetShell } from './WidgetShell';

/** Compact, human uptime: "3d 4h", "4h 12m", "12m". */
function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${Math.floor(seconds)}s`;
}

/** 12500 -> "12.5k". Sidebars are narrow; full digits wrap badly. */
function compact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

/** "openai/whisper-large-v3-turbo" -> "whisper-large-v3-turbo". */
function shortModel(model: string): string {
  return model.includes('/') ? model.slice(model.lastIndexOf('/') + 1) : model;
}

export function SystemStatsWidget({ widget }: { widget: WidgetInstance }) {
  const refreshSeconds = Number(widget.settings.refreshSeconds ?? 60);
  const showModel = Boolean(widget.settings.showModel);
  const showUptime = Boolean(widget.settings.showUptime);
  const showTotals = Boolean(widget.settings.showTotals);

  const { stats, loading } = useWidgetStats(refreshSeconds);

  if (loading && !stats) {
    return (
      <WidgetShell title={widget.title}>
        <div className="space-y-2" aria-hidden="true">
          <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title={widget.title}>
      {showModel && stats && (
        <div className="mb-2 border-b border-white/5 pb-2">
          <p className="text-[11px] text-slate-500">Active model</p>
          <p className="truncate text-xs font-medium text-brand-200" title={stats.model}>
            {shortModel(stats.model)}
          </p>
        </div>
      )}

      {showUptime && stats && (
        <WidgetRow label="Uptime" value={formatUptime(stats.uptimeSeconds)} tone="good" />
      )}

      {showTotals &&
        (stats?.totals ? (
          <>
            <WidgetRow label="Transcriptions" value={compact(stats.totals.conversions)} />
            <WidgetRow label="Characters" value={compact(stats.totals.characters)} tone="muted" />
          </>
        ) : (
          <WidgetRow label="Transcriptions" value="—" tone="muted" />
        ))}

      {stats && (
        <p className="mt-2 border-t border-white/5 pt-2 text-[10px] text-slate-600">
          v{stats.version}
        </p>
      )}
    </WidgetShell>
  );
}
