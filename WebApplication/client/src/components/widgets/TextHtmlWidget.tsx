/**
 * Custom Text / HTML widget.
 *
 * The only widget that renders admin-authored markup, so it is the only one
 * using `dangerouslySetInnerHTML`. That is safe here for one specific reason:
 * the server ran this string through a parser-based allowlist sanitiser
 * (`sanitiseHtmlFragment`) before storing it *and* again on every read, so
 * scripts, iframes, styles, event handlers and `javascript:` URLs are already
 * gone by the time it reaches this component.
 *
 * The defence is deliberately server-side rather than here: a client-side
 * sanitiser can be bypassed by anything that talks to the API directly, and
 * the stored value is what other consumers (Phase 2 extension, Phase 3 mobile)
 * will read too. Sanitising at the boundary protects all of them at once.
 */

import type { WidgetInstance } from '../../types/widgets';
import { WidgetShell } from './WidgetShell';

export function TextHtmlWidget({ widget }: { widget: WidgetInstance }) {
  const body = String(widget.settings.body ?? '');
  const align = String(widget.settings.align ?? 'left');

  const alignment =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  if (!body.trim()) {
    return (
      <WidgetShell title={widget.title}>
        <p className="text-xs italic text-slate-600">This block has no content yet.</p>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title={widget.title}>
      {/*
        `widget-prose` supplies typography for tags the admin may use — the
        sanitiser's allowlist and this stylesheet rule are two halves of the
        same contract, so they live close together in styles/index.css.
      */}
      <div
        className={`widget-prose text-sm leading-relaxed text-slate-300 ${alignment}`}
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </WidgetShell>
  );
}
