import { useState } from 'react';

interface ColorPickerWorkbenchProps {
  initialHex?: string;
  onColorChange?: (hex: string) => void;
  showContrastScore?: boolean;
}

export function ColorPickerWorkbench({
  initialHex = '#3b82f6',
  onColorChange,
  showContrastScore = true,
}: ColorPickerWorkbenchProps) {
  const [hex, setHex] = useState(initialHex);
  const [copiedHex, setCopiedHex] = useState(false);

  const handleHexInput = (val: string) => {
    let clean = val.trim();
    if (!clean.startsWith('#') && clean.length > 0) clean = `#${clean}`;
    setHex(clean);
    if (onColorChange && /^#[0-9A-Fa-f]{6}$/.test(clean)) {
      onColorChange(clean);
    }
  };

  const handleNativePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHex(val);
    if (onColorChange) onColorChange(val);
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
  };

  // Common quick palette swatches
  const PRESET_SWATCHES = [
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#10b981',
    '#06b6d4',
    '#0f172a',
    '#64748b',
    '#ffffff',
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Interactive Color Workbench
        </span>
        <span className="rounded bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-300">
          Color Space Engine
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Visual Swatch & Native Picker */}
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-white/20 shadow-xl">
            <input
              type="color"
              value={/^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#3b82f6'}
              onChange={handleNativePicker}
              className="absolute -inset-4 h-28 w-28 cursor-pointer opacity-0"
              title="Click to pick a color"
            />
            <div
              style={{ backgroundColor: hex }}
              className="h-full w-full rounded-2xl flex items-center justify-center text-[10px] font-bold text-white drop-shadow"
            >
              Pick
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase text-slate-400">
              HEX Code
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={hex}
                onChange={(e) => handleHexInput(e.target.value)}
                placeholder="#3B82F6"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 font-mono text-sm font-semibold text-white focus:border-brand-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(hex)}
                className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition-colors"
                title="Copy HEX code"
              >
                {copiedHex ? '✓' : '📋'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Swatches Palette */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase text-slate-400">
            Quick Swatches
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => {
                  setHex(swatch);
                  if (onColorChange) onColorChange(swatch);
                }}
                style={{ backgroundColor: swatch }}
                className={`h-7 w-7 rounded-lg border transition-transform hover:scale-110 ${
                  hex.toLowerCase() === swatch.toLowerCase()
                    ? 'border-white ring-2 ring-brand-400'
                    : 'border-white/20'
                }`}
                title={swatch}
              />
            ))}
          </div>
        </div>
      </div>

      {showContrastScore && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px]">
          <div className="rounded-xl bg-slate-950 p-2.5 flex items-center justify-between">
            <span className="text-slate-400">On White Background:</span>
            <span
              style={{ color: hex, backgroundColor: '#ffffff' }}
              className="px-2 py-0.5 rounded font-bold"
            >
              Aa Sample
            </span>
          </div>
          <div className="rounded-xl bg-slate-950 p-2.5 flex items-center justify-between">
            <span className="text-slate-400">On Dark Background:</span>
            <span
              style={{ color: hex, backgroundColor: '#0f172a' }}
              className="px-2 py-0.5 rounded font-bold"
            >
              Aa Sample
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
