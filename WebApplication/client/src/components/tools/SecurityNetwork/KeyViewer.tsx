import { useState } from 'react';

interface KeyViewerProps {
  label: string;
  value: string;
  badge?: string;
  isSecret?: boolean;
  onRegenerate?: () => void;
}

export function KeyViewer({ label, value, badge, isSecret = false, onRegenerate }: KeyViewerProps) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!isSecret);

  const handleCopy = () => {
    if (!value) return;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPem = () => {
    if (!value) return;
    const blob = new Blob([value], { type: 'application/x-pem-file;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-slate-950/80 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-300">{label}</span>
          {badge && (
            <span className="rounded bg-brand-500/10 px-2 py-0.5 font-mono text-[10px] text-brand-300 font-medium">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {isSecret && (
            <button
              type="button"
              onClick={() => setRevealed(!revealed)}
              className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              {revealed ? '🙈 Hide' : '👁️ Reveal'}
            </button>
          )}

          {value.includes('-----BEGIN') && (
            <button
              type="button"
              onClick={handleDownloadPem}
              className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              📥 Download PEM
            </button>
          )}

          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              🔄 Regenerate
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40 transition-colors"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-3 font-mono text-xs text-slate-200">
        <textarea
          readOnly
          value={revealed ? value : '•'.repeat(Math.min(value.length, 64))}
          className="w-full resize-none bg-transparent font-mono text-xs leading-relaxed text-brand-300 focus:outline-none"
          rows={Math.min(Math.max(value.split('\n').length, 2), 12)}
        />
      </div>
    </div>
  );
}
