/**
 * One draggable source item in the warehouse.
 *
 * Draggable but not sortable: the warehouse is an infinite source, not a list
 * being reordered. Dragging one produces a *new* instance in the target zone
 * and the warehouse item stays put — the same model as WordPress's widget
 * panel, where "Text" can be added many times.
 *
 * The `source:` id prefix is how the drag handler tells a warehouse drag from
 * a reorder of an already-placed widget.
 */

import { useDraggable } from '@dnd-kit/core';

import type { WidgetDefinition } from '../../../../types/widgets';
import { WidgetIcon } from './WidgetIcon';

export function WarehouseItem({
  definition,
  onAdd,
}: {
  definition: WidgetDefinition;
  onAdd: (definition: WidgetDefinition) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `source:${definition.type}`,
    data: { kind: 'source', definition },
  });

  return (
    <div
      ref={setNodeRef}
      className={`group rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-brand-400/30 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/*
          The drag handle is the icon, not the whole card. The card also holds
          an "Add" button, and a card-wide drag listener would swallow that
          click on touch devices where a tap and a drag start look identical.
        */}
        <button
          type="button"
          ref={setNodeRef as unknown as React.Ref<HTMLButtonElement>}
          {...listeners}
          {...attributes}
          aria-label={`Drag ${definition.name} into a sidebar`}
          className="mt-0.5 cursor-grab touch-none rounded-md p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-brand-300 active:cursor-grabbing"
        >
          <WidgetIcon name={definition.icon} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-200">{definition.name}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            {definition.description}
          </p>
        </div>
      </div>

      {/*
        Keyboard and touch users need a path that does not require dragging.
        Drag-and-drop is the showcase interaction, but it must not be the only
        way to complete the task.
      */}
      <button
        type="button"
        onClick={() => onAdd(definition)}
        className="mt-2 w-full rounded-lg border border-white/10 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-brand-200"
      >
        + Add to left sidebar
      </button>
    </div>
  );
}
