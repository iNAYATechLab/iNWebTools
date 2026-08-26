import { useState } from 'react';

interface DiffViewerProps {
  originalText?: string;
  modifiedText?: string;
  onCompare?: (orig: string, mod: string) => void;
}

export function DiffViewer({ originalText = '', modifiedText = '', onCompare }: DiffViewerProps) {
  const [orig, setOrig] = useState(originalText);
  const [mod, setMod] = useState(modifiedText);

  const origLines = orig.split('\n');
  const modLines = mod.split('\n');
  const maxLines = Math.max(origLines.length, modLines.length, 1);

  const handleRunDiff = () => {
    if (onCompare) onCompare(orig, mod);
  };

  return (
    <div className="space-y-4">
      {/* Diff Controls */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Side-by-Side Diff Comparison
        </h4>
        <button
          type="button"
          onClick={handleRunDiff}
          className="rounded-xl bg-brand-500/20 px-3 py-1.5 text-xs font-semibold text-brand-300 hover:bg-brand-500/30 transition-colors"
        >
          ⚡ Re-evaluate Diff
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Original */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden">
          <div className="border-b border-white/10 bg-slate-900/90 px-4 py-2 font-mono text-xs font-bold text-red-400">
            Original Text
          </div>
          <textarea
            value={orig}
            onChange={(e) => setOrig(e.target.value)}
            rows={10}
            className="w-full resize-none bg-transparent p-3 font-mono text-xs text-slate-200 focus:outline-none"
            placeholder="Paste original text..."
          />
        </div>

        {/* Modified */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden">
          <div className="border-b border-white/10 bg-slate-900/90 px-4 py-2 font-mono text-xs font-bold text-emerald-400">
            Modified Text
          </div>
          <textarea
            value={mod}
            onChange={(e) => setMod(e.target.value)}
            rows={10}
            className="w-full resize-none bg-transparent p-3 font-mono text-xs text-slate-200 focus:outline-none"
            placeholder="Paste modified text..."
          />
        </div>
      </div>

      {/* Synchronized Diff Comparison Table */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/90 overflow-hidden">
        <div className="border-b border-white/10 bg-slate-900/90 px-4 py-2 font-mono text-xs font-bold text-slate-300">
          Line-by-Line Comparison View
        </div>
        <div className="max-h-72 overflow-auto font-mono text-xs divide-y divide-white/5">
          {Array.from({ length: maxLines }).map((_, i) => {
            const line1 = origLines[i] ?? '';
            const line2 = modLines[i] ?? '';
            const isDifferent = line1 !== line2;

            return (
              <div
                key={i}
                className={`grid grid-cols-2 p-2 gap-4 ${
                  isDifferent ? 'bg-amber-500/10' : 'hover:bg-white/[0.01]'
                }`}
              >
                <div
                  className={`truncate ${
                    isDifferent && line1 ? 'text-red-400 line-through' : 'text-slate-400'
                  }`}
                >
                  <span className="mr-2 text-slate-600 select-none">{i + 1}</span>
                  {line1 || <span className="text-slate-600 italic">(empty)</span>}
                </div>
                <div
                  className={`truncate ${
                    isDifferent && line2 ? 'text-emerald-400 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <span className="mr-2 text-slate-600 select-none">{i + 1}</span>
                  {line2 || <span className="text-slate-600 italic">(empty)</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
