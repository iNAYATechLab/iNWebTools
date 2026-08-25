/**
 * Renders one placement zone from the stored configuration.
 *
 * Fully data-driven: it takes a list of widget instances, resolves each `type`
 * through the registry and renders it. It knows nothing about which widgets
 * exist — that is the registry's job — and nothing about where they came from
 * — that is the config hook's job.
 *
 * Disabled widgets are filtered here rather than in each component so that
 * "hidden" costs nothing at runtime: the component never mounts, so a hidden
 * stats widget stops polling entirely.
 *
 * An empty zone renders nothing at all (not an empty column). That is what
 * lets the same page layout collapse to a single centred column when an admin
 * empties both sidebars, with no special case anywhere else.
 */

import type { WidgetInstance } from '../../types/widgets';
import { resolveWidget } from './registry';

export function SidebarZone({
  widgets,
  label,
  className = '',
}: {
  widgets: WidgetInstance[];
  label: string;
  className?: string;
}) {
  const visible = widgets.filter((w) => w.enabled);
  if (visible.length === 0) return null;

  return (
    <aside aria-label={label} className={`space-y-4 ${className}`}>
      {visible.map((widget) => {
        const Component = resolveWidget(widget.type);
        return <Component key={widget.id} widget={widget} />;
      })}
    </aside>
  );
}
