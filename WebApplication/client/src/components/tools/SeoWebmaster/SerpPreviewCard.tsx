import { useState } from 'react';

interface SerpPreviewCardProps {
  title: string;
  description: string;
  url: string;
}

export function SerpPreviewCard({ title, description, url }: SerpPreviewCardProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  const displayUrl = url
    ? url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : 'inwebtools.com/tools';
  const displayTitle = title || 'iNWebTools — 1070+ Free Online Developer Tools';
  const displayDesc =
    description ||
    'High-speed in-browser tools for audio transcription, cURL to code generation, cryptography, and unit conversion with zero server latency.';

  const titleLength = displayTitle.length;
  const descLength = displayDesc.length;

  return (
    <div className="space-y-4">
      {/* Device Toggle & Meter */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Google SERP Simulator
          </span>
          <div className="flex rounded-lg bg-slate-900 p-0.5 border border-white/10 text-[11px]">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                device === 'desktop'
                  ? 'bg-brand-500 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💻 Desktop
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                device === 'mobile'
                  ? 'bg-brand-500 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📱 Mobile
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className={titleLength > 60 ? 'text-amber-400' : 'text-emerald-400'}>
            Title: {titleLength}/60 chars
          </span>
          <span className={descLength > 160 ? 'text-amber-400' : 'text-emerald-400'}>
            Desc: {descLength}/160 chars
          </span>
        </div>
      </div>

      {/* Google Result Card Simulation */}
      <div
        className={`rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-xl transition-all ${
          device === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
        }`}
      >
        {/* Favicon & Breadcrumb */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
            ⚡
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-semibold text-slate-800 leading-tight">
              iNWebTools
            </span>
            <span className="text-[11px] text-slate-500 truncate leading-tight">
              https://{displayUrl}
            </span>
          </div>
        </div>

        {/* Title Link */}
        <h3 className="mt-2 text-lg font-medium text-blue-800 hover:underline cursor-pointer leading-snug">
          {displayTitle}
        </h3>

        {/* Description Snippet */}
        <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-3">{displayDesc}</p>

        {/* Rich Snippet Simulation */}
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
          <span className="text-amber-500 font-bold">★★★★★</span>
          <span>Rating: 4.9 · 1070+ Reviews · Free Developer Suite</span>
        </div>
      </div>
    </div>
  );
}
