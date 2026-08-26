import { useState } from 'react';

interface DigestTableProps {
  digests: Record<string, string>;
  primaryAlgorithm?: string;
}

export function DigestTable({ digests, primaryAlgorithm }: DigestTableProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyHash = (key: string, hash: string) => {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(hash);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Cryptographic Hash Matrix
        </h4>
        <span className="text-[11px] font-mono text-brand-400">
          {Object.keys(digests).length} Algorithms Computed
        </span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/90 overflow-hidden divide-y divide-white/5">
        {Object.entries(digests).map(([algo, hash]) => {
          const isPrimary =
            primaryAlgorithm &&
            algo.toLowerCase().replace(/[^a-z0-9]/g, '') ===
              primaryAlgorithm.toLowerCase().replace(/[^a-z0-9]/g, '');

          return (
            <div
              key={algo}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 transition-colors ${
                isPrimary ? 'bg-brand-500/10' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-[120px]">
                <span
                  className={`font-mono text-xs font-bold ${
                    isPrimary ? 'text-brand-300' : 'text-slate-300'
                  }`}
                >
                  {algo.toUpperCase()}
                </span>
                {isPrimary && (
                  <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-brand-300">
                    Primary
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 font-mono text-xs text-slate-300 truncate">
                <span className="select-all">{hash}</span>
              </div>

              <button
                type="button"
                onClick={() => copyHash(algo, hash)}
                className="self-start sm:self-center rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-mono text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                {copiedKey === algo ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
