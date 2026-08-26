import { useState } from 'react';

interface SocialCardPreviewProps {
  title: string;
  description: string;
  imageUrl?: string;
  image?: string;
  url?: string;
  siteName?: string;
}

export function SocialCardPreview({
  title,
  description,
  imageUrl,
  image,
  url = 'inwebtools.com',
  siteName = 'iNWebTools',
}: SocialCardPreviewProps) {
  const [platform, setPlatform] = useState<'facebook' | 'twitter'>('facebook');

  const domain = url.replace(/^https?:\/\//, '').split('/')[0] || 'inwebtools.com';
  const displayImage =
    imageUrl ||
    image ||
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="space-y-4">
      {/* Platform Toggle */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Social Share Card Simulator
        </span>
        <div className="flex rounded-lg bg-slate-900 p-0.5 border border-white/10 text-[11px]">
          <button
            type="button"
            onClick={() => setPlatform('facebook')}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              platform === 'facebook'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Facebook / LinkedIn
          </button>
          <button
            type="button"
            onClick={() => setPlatform('twitter')}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              platform === 'twitter'
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Twitter / X
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl max-w-lg mx-auto">
        {/* Card Image Banner */}
        <div className="relative aspect-[1.91/1] w-full bg-slate-900 overflow-hidden">
          <img
            src={displayImage}
            alt={title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80';
            }}
          />
          <div className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur">
            {domain}
          </div>
        </div>

        {/* Card Content Details */}
        <div className="p-4 space-y-1.5 bg-slate-900/90">
          <span className="block font-mono text-[10px] uppercase font-semibold text-slate-400">
            {platform === 'facebook' ? siteName : domain}
          </span>
          <h4 className="text-sm font-bold text-white leading-tight line-clamp-1">
            {title || 'iNWebTools — Enterprise Developer Platform'}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
            {description ||
              'Explore 1070+ free web developer tools, speech to text, and real-time utilities.'}
          </p>
        </div>
      </div>
    </div>
  );
}
