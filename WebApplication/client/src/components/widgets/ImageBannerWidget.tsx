/**
 * Image / Ad Banner widget — a sponsor slot, promo image or screenshot.
 *
 * The image URL and link were validated server-side (`safeUrl`), which is what
 * stops a `javascript:` link. This component still adds `rel="noopener
 * noreferrer"` on every new-tab link: without noopener the opened page can
 * reach back through `window.opener` and navigate this one, and a banner is
 * exactly the sort of third-party destination where that matters.
 *
 * `loading="lazy"` because a sidebar banner is very often below the fold and
 * must not compete with the transcriber for bandwidth on first paint.
 */

import type { WidgetInstance } from '../../types/widgets';
import { WidgetShell } from './WidgetShell';

export function ImageBannerWidget({ widget }: { widget: WidgetInstance }) {
  const imageUrl = String(widget.settings.imageUrl ?? '');
  const alt = String(widget.settings.alt ?? '');
  const linkUrl = String(widget.settings.linkUrl ?? '');
  const caption = String(widget.settings.caption ?? '');
  const newTab = Boolean(widget.settings.newTab);
  const rounded = Boolean(widget.settings.rounded);

  if (!imageUrl) {
    return (
      <WidgetShell title={widget.title}>
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-slate-600">
          No image set
        </div>
      </WidgetShell>
    );
  }

  const image = (
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      className={`w-full object-cover ${rounded ? 'rounded-lg' : ''}`}
    />
  );

  return (
    <WidgetShell title={widget.title}>
      {linkUrl ? (
        <a
          href={linkUrl}
          target={newTab ? '_blank' : undefined}
          rel={newTab ? 'noopener noreferrer sponsored' : 'sponsored'}
          className="block transition-opacity hover:opacity-90"
        >
          {image}
        </a>
      ) : (
        image
      )}

      {caption && <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{caption}</p>}
    </WidgetShell>
  );
}
