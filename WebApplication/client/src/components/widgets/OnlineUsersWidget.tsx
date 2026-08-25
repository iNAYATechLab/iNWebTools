/**
 * Live Online Users widget.
 *
 * Reads the shared public stats poll, so several stats widgets on one page
 * cost one request rather than one each. The numbers are aggregate counts
 * only — the per-session rows behind them stay behind the admin API.
 *
 * When the database is unavailable the server sends `online: null`; that is
 * rendered as a dash with an explanatory line rather than a zero, because
 * "0 people online" and "we cannot tell" are different facts.
 */

import { useWidgetStats } from '../../hooks/useWidgetStats';
import type { WidgetInstance } from '../../types/widgets';
import { WidgetRow, WidgetShell } from './WidgetShell';

export function OnlineUsersWidget({ widget }: { widget: WidgetInstance }) {
  const refreshSeconds = Number(widget.settings.refreshSeconds ?? 30);
  const showDevices = Boolean(widget.settings.showDeviceBreakdown);
  const showCountries = Boolean(widget.settings.showCountries);

  const { stats, loading } = useWidgetStats(refreshSeconds);
  const online = stats?.online ?? null;

  return (
    <WidgetShell title={widget.title}>
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {online && online.total > 0 && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              online && online.total > 0 ? 'bg-emerald-400' : 'bg-slate-600'
            }`}
          />
        </span>

        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums leading-none text-white">
            {loading ? '···' : (online?.total ?? '—')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {online
              ? `active in the last ${Math.round(online.windowSeconds / 60)} min`
              : 'live count unavailable'}
          </p>
        </div>
      </div>

      {online && (showDevices || showCountries) && (
        <div className="mt-3 border-t border-white/5 pt-2">
          {showDevices && (
            <>
              <WidgetRow label="Desktop" value={online.desktop} tone="muted" />
              <WidgetRow label="Mobile" value={online.mobile} tone="muted" />
              {online.tablet > 0 && <WidgetRow label="Tablet" value={online.tablet} tone="muted" />}
            </>
          )}
          {showCountries && <WidgetRow label="Countries" value={online.countries} tone="muted" />}
        </div>
      )}
    </WidgetShell>
  );
}
