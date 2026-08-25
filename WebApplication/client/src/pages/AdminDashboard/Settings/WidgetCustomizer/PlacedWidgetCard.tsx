/**
 * One widget placed in a zone: drag handle, visibility toggle, delete, and an
 * expandable settings panel.
 *
 * Sortable rather than merely draggable, so it can be reordered within its
 * zone and moved across to the other one.
 *
 * The drag listeners are bound to a dedicated handle, not the card. The card
 * contains a toggle, a delete button and — when expanded — a whole form with
 * text inputs. Making the card itself draggable would steal pointer events
 * from every one of those: selecting text in a textarea would start a drag.
 * A handle is the standard answer and it is also better for touch, where the
 * card body needs to stay scrollable.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { WidgetDefinition, WidgetInstance } from '../../../../types/widgets';
import { WidgetIcon } from './WidgetIcon';
import { WidgetSettingsForm } from './WidgetSettingsForm';

export function PlacedWidgetCard({
  widget,
  definition,
  expanded,
  onToggleExpanded,
  onChange,
  onRemove,
}: {
  widget: WidgetInstance;
  definition: WidgetDefinition | undefined;
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (patch: Partial<WidgetInstance>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    data: { kind: 'placed', widget },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-slate-900/60 transition-colors ${
        isDragging
          ? 'z-10 border-brand-400/50 opacity-50 shadow-lg'
          : 'border-white/10 hover:border-white/20'
      } ${!widget.enabled ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-1.5 p-2.5">
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label={`Reorder ${widget.title || definition?.name || widget.type}`}
          className="cursor-grab touch-none rounded p-1 text-slate-600 transition-colors hover:bg-white/5 hover:text-slate-300 active:cursor-grabbing"
        >
          {/* Six-dot grip: the conventional affordance for "drag me". */}
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9-13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm1 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
          </svg>
        </button>

        <span className="shrink-0 text-slate-500">
          <WidgetIcon name={definition?.icon ?? 'text'} className="h-3.5 w-3.5" />
        </span>

        <button
          type="button"
          onClick={onToggleExpanded}
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
        >
          <p className="truncate text-xs font-medium text-slate-200">
            {widget.title || definition?.name || widget.type}
          </p>
          <p className="truncate text-[10px] text-slate-600">
            {definition?.name ?? `Unknown type: ${widget.type}`}
          </p>
        </button>

        {/* Hide/show. Kept in the zone but not rendered on the site. */}
        <button
          type="button"
          onClick={() => onChange({ enabled: !widget.enabled })}
          aria-label={widget.enabled ? 'Hide this widget' : 'Show this widget'}
          title={widget.enabled ? 'Visible — click to hide' : 'Hidden — click to show'}
          className={`rounded p-1 transition-colors hover:bg-white/5 ${
            widget.enabled ? 'text-emerald-400' : 'text-slate-600'
          }`}
        >
          {widget.enabled ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10 4c-3.9 0-7.2 2.4-8.6 5.8a.75.75 0 0 0 0 .57C2.8 13.75 6.1 16 10 16s7.2-2.25 8.6-5.63a.75.75 0 0 0 0-.57C17.2 6.4 13.9 4 10 4Zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3.28 2.22a.75.75 0 1 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-2.2-2.2A9.6 9.6 0 0 0 18.6 10.4a.75.75 0 0 0 0-.57C17.2 6.4 13.9 4 10 4c-1.3 0-2.55.27-3.68.75L3.28 2.22ZM10 16c-3.9 0-7.2-2.25-8.6-5.63a.75.75 0 0 1 0-.57 9.5 9.5 0 0 1 2.5-3.4l2.6 2.6a4 4 0 0 0 5.5 5.5l1.4 1.4c-1.02.4-2.14.6-3.4.6Z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove this widget"
          title="Remove from this zone"
          className="rounded p-1 text-slate-600 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M8.5 3a.75.75 0 0 0-.75.75V4.5H4.75a.75.75 0 0 0 0 1.5h.56l.7 9.1A2 2 0 0 0 8 17h4a2 2 0 0 0 2-1.9l.7-9.1h.55a.75.75 0 0 0 0-1.5H12.25V3.75A.75.75 0 0 0 11.5 3h-3Z" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-3">
          {definition ? (
            <WidgetSettingsForm widget={widget} definition={definition} onChange={onChange} />
          ) : (
            <p className="text-[11px] leading-relaxed text-amber-300/80">
              This widget's type is not in the catalogue, so its settings cannot be edited here. It
              will be skipped when the page renders. Remove it unless a newer server version is
              expected to provide it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
