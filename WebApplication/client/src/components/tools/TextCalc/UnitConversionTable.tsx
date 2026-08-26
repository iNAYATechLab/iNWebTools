import { useState } from 'react';

interface UnitConversionTableProps {
  units: Record<string, string>;
  title?: string;
}

export function UnitConversionTable({
  units,
  title = 'Converted Equivalent Scales',
}: UnitConversionTableProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyVal = (k: string, val: string) => {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(val);
    }
    setCopiedKey(k);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h4>
        <span className="text-[11px] font-mono text-brand-400">
          {Object.keys(units).length} Scales Calculated
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(units).map(([unitKey, val]) => (
          <div
            key={unitKey}
            className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/80 p-3.5 hover:border-brand-400/30 transition-colors"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>{unitKey.replace(/([A-Z])/g, ' $1').trim()}</span>
              <button
                type="button"
                onClick={() => copyVal(unitKey, String(val))}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {copiedKey === unitKey ? '✓ Copied' : '📋'}
              </button>
            </div>
            <p className="mt-2 text-base font-mono font-bold text-brand-300 truncate">
              {String(val)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
