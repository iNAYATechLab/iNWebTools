import { useState } from 'react';

interface CssVisualPreviewProps {
  title?: string;
  cssStyle?: React.CSSProperties;
  customClass?: string;
  rawCss?: string;
  shapeType?: 'box' | 'circle' | 'card' | 'triangle' | 'grid' | 'svg';
  svgContent?: string;
}

export function CssVisualPreview({
  title = 'Live Visual CSS Preview',
  cssStyle = {},
  rawCss = '',
  shapeType = 'box',
  svgContent,
}: CssVisualPreviewProps) {
  const [bgMode, setBgMode] = useState<'dark' | 'light' | 'checker'>('dark');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!rawCss) return;
    void navigator.clipboard.writeText(rawCss);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bgClasses = {
    dark: 'bg-slate-950 border-slate-800',
    light: 'bg-slate-100 border-slate-300',
    checker:
      'bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-900 border-slate-800',
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</span>
          <span className="rounded bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-300">
            Live Interactive
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Background Toggle */}
          <div className="flex rounded-lg border border-white/10 bg-slate-900 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setBgMode('dark')}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                bgMode === 'dark' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌙 Dark
            </button>
            <button
              type="button"
              onClick={() => setBgMode('light')}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                bgMode === 'light' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              ☀️ Light
            </button>
            <button
              type="button"
              onClick={() => setBgMode('checker')}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                bgMode === 'checker' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🏁 Grid
            </button>
          </div>

          {rawCss && (
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-brand-400/30 bg-brand-500/20 px-3 py-1 text-[11px] font-semibold text-brand-300 hover:bg-brand-500/30 transition-colors"
            >
              {copied ? '✓ Copied CSS' : '📋 Copy CSS'}
            </button>
          )}
        </div>
      </div>

      {/* Visual Canvas */}
      <div
        className={`relative flex min-h-[280px] w-full items-center justify-center overflow-hidden rounded-2xl border p-8 shadow-inner transition-colors ${bgClasses[bgMode]}`}
      >
        {svgContent ? (
          <div
            className="flex h-44 w-44 items-center justify-center"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : shapeType === 'triangle' ? (
          <div style={cssStyle} className="transition-all duration-300" />
        ) : (
          <div
            style={cssStyle}
            className="relative flex h-48 w-72 items-center justify-center p-6 text-center shadow-2xl transition-all duration-300"
          >
            <div className="pointer-events-none select-none">
              <p className="text-sm font-bold text-white drop-shadow-md">iNWebTools Design Box</p>
              <p className="mt-1 text-[11px] text-white/80 drop-shadow-sm font-mono">
                Visual CSS Rendering
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Code Snippet Box */}
      {rawCss && (
        <div className="rounded-xl border border-white/10 bg-slate-950 p-3 font-mono text-xs text-slate-300">
          <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500">
            <span>Generated CSS Code</span>
            <span>CSS3 / Modern Standard</span>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-brand-300">
            {rawCss}
          </pre>
        </div>
      )}
    </div>
  );
}
