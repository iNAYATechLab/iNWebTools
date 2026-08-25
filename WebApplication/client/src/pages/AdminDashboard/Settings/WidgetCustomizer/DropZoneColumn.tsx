/**
 * One drop target column — "Left Sidebar" or "Right Sidebar".
 *
 * Two things make this work as a target:
 *
 *   1. `SortableContext` gives the cards inside it reorder behaviour.
 *   2. `useDroppable` on the column itself makes the *empty space* a target
 *      too. Without it, an empty zone could never receive a widget: with no
 *      sortable children there would be nothing for the drag to collide with,
 *      and dropping onto an emptied sidebar would silently do nothing.
 */

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import type { WidgetDefinition, WidgetInstance, WidgetZone } from '../../../../types/widgets';
import { PlacedWidgetCard } from './PlacedWidgetCard';

export function DropZoneColumn({
  zone,
  title,
  widgets,
  definitions,
  expandedId,
  onToggleExpanded,
  onChangeWidget,
  onRemoveWidget,
}: {
  zone: WidgetZone;
  title: string;
  widgets: WidgetInstance[];
  definitions: Map<string, WidgetDefinition>;
  expandedId: string | null;
  onToggleExpanded: (id: string) => void;
  onChangeWidget: (id: string, patch: Partial<WidgetInstance>) => void;
  onRemoveWidget: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `zone:${zone}`,
    data: { kind: 'zone', zone },
  });

  const visibleCount = widgets.filter((w) => w.enabled).length;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        <span className="text-[10px] tabular-nums text-slate-600">
          {visibleCount}/{widgets.length} visible
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[9rem] flex-1 rounded-xl border-2 border-dashed p-2 transition-colors ${
          isOver ? 'border-brand-400/60 bg-brand-500/5' : 'border-white/10'
        }`}
      >
        <SortableContext items={widgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {widgets.map((widget) => (
              <PlacedWidgetCard
                key={widget.id}
                widget={widget}
                definition={definitions.get(widget.type)}
                expanded={expandedId === widget.id}
                onToggleExpanded={() => onToggleExpanded(widget.id)}
                onChange={(patch) => onChangeWidget(widget.id, patch)}
                onRemove={() => onRemoveWidget(widget.id)}
              />
            ))}
          </div>
        </SortableContext>

        {widgets.length === 0 && (
          <div className="flex h-32 items-center justify-center px-4 text-center">
            <p className="text-[11px] leading-relaxed text-slate-600">
              Drag a widget here from the warehouse, or use its “Add” button.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
