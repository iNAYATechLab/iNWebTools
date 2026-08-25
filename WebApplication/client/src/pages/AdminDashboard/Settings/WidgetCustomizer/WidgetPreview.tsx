/**
 * Live preview of the arrangement being edited.
 *
 * Renders the *real* widget components through the same registry the public
 * site uses, against the in-progress (unsaved) config. A mock preview would
 * drift from production the first time a widget changed; this cannot, because
 * there is only one implementation of each widget.
 *
 * Two honest caveats, surfaced in the UI rather than hidden:
 *
 *   1. Custom HTML is shown *unsanitised* here, because the sanitiser runs on
 *      the server at save time. What the admin sees before saving is their raw
 *      input; after saving, the editor adopts the server's cleaned copy and
 *      the preview updates to match. The note below says so, so an admin whose
 *      <script> tag disappears on save is not confused.
 *   2. Widgets are rendered at preview width, not the site's sidebar width.
 *
 * LocaleProvider is required: Quick Tools calls `useLocale`, and the admin
 * area deliberately sits outside the public locale context. Without a provider
 * here that widget would throw and take the whole preview panel down.
 */

import { LocaleProvider } from '../../../../i18n/LocaleContext';
import { resolveWidget } from '../../../../components/widgets/registry';
import type { WidgetConfig, WidgetInstance, WidgetZone } from '../../../../types/widgets';
import { Card } from '../../components/ui';

const ZONE_LABELS: Record<WidgetZone, string> = { left: 'Left', right: 'Right' };

function PreviewColumn({ zone, widgets }: { zone: WidgetZone; widgets: WidgetInstance[] }) {
  const visible = widgets.filter((w) => w.enabled);

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {ZONE_LABELS[zone]}
      </p>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[10px] text-slate-700">
          Nothing visible
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((widget) => {
            const Component = resolveWidget(widget.type);
            return <Component key={widget.id} widget={widget} />;
          })}
        </div>
      )}
    </div>
  );
}

export function WidgetPreview({ config }: { config: WidgetConfig }) {
  const hasAny = config.zones.left.length > 0 || config.zones.right.length > 0;

  return (
    <Card title="Live preview" description="The real components, at preview width.">
      {hasAny ? (
        /*
          Quick Tools calls `useLocale`, and the admin area sits outside the
          public locale context by design. Without this provider that widget
          throws and takes the whole preview panel down with it.
        */
        <LocaleProvider>
          <div className="space-y-4">
            <PreviewColumn zone="left" widgets={config.zones.left} />
            <PreviewColumn zone="right" widgets={config.zones.right} />
          </div>
        </LocaleProvider>
      ) : (
        <p className="py-6 text-center text-[11px] text-slate-600">
          Both sidebars are empty. The site will render the transcriber in a single centred column.
        </p>
      )}

      <p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-relaxed text-slate-600">
        Custom HTML appears here exactly as typed. Scripts, iframes and event handlers are removed
        when you save, so the published version may differ.
      </p>
    </Card>
  );
}
