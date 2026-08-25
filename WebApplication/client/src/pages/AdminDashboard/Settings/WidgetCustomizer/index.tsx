/**
 * Widget Customizer — the drag-and-drop sidebar builder.
 *
 * Three panels: a warehouse of available types on the left, the two placement
 * zones in the middle, and a live preview on the right.
 *
 * Drag model
 * ----------
 * Two different drags share one DndContext, told apart by the dragged id:
 *
 *   `source:<type>` — a warehouse item. Dropping it *creates* a new instance;
 *                     the warehouse entry itself never moves.
 *   `<widget id>`   — a placed widget. Dropping it reorders within a zone or
 *                     moves it to the other zone.
 *
 * Drop targets are likewise two kinds: `zone:<name>` (the column, including
 * its empty space) and a placed widget's own id (drop *before/after* it).
 * Resolving both into "which zone, which index" is `locate()` below.
 *
 * State ownership
 * ---------------
 * The whole document is held in one `config` state object and saved wholesale.
 * A widget layout is an arrangement, not a set of independent fields — a
 * per-widget autosave would let two reorders interleave and produce an order
 * neither admin chose.
 *
 * `dirty` is tracked against the last saved snapshot so the Save button can
 * be disabled when nothing changed, and a beforeunload guard can warn about
 * losing work. Both matter here because arranging a sidebar is many small
 * edits that are tedious to redo.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import { invalidateWidgetConfig } from '../../../../hooks/useWidgetConfig';
import { getWidgetCatalogue, getWidgetConfig } from '../../../../services/api';
import { AdminApiError, saveWidgetConfig } from '../../../../services/adminApi';
import {
  WIDGET_ZONES,
  instantiateWidget,
  type WidgetConfig,
  type WidgetDefinition,
  type WidgetInstance,
  type WidgetZone,
} from '../../../../types/widgets';
import { Button, Card, ErrorState, LoadingBlock, PageHeader } from '../../components/ui';
import { DropZoneColumn } from './DropZoneColumn';
import { WarehouseItem } from './WarehouseItem';
import { WidgetIcon } from './WidgetIcon';
import { WidgetPreview } from './WidgetPreview';

const EMPTY: WidgetConfig = { zones: { left: [], right: [] } };

const ZONE_TITLES: Record<WidgetZone, string> = {
  left: 'Left Sidebar Zone',
  right: 'Right Sidebar Zone',
};

/** Deep-ish equality via serialisation — enough for a plain JSON document. */
const same = (a: WidgetConfig, b: WidgetConfig) => JSON.stringify(a) === JSON.stringify(b);

export function WidgetCustomizer() {
  const [config, setConfig] = useState<WidgetConfig>(EMPTY);
  const [catalogue, setCatalogue] = useState<WidgetDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<
    | { kind: 'source'; definition: WidgetDefinition }
    | { kind: 'placed'; widget: WidgetInstance }
    | null
  >(null);

  /** Last saved snapshot, for the dirty check. */
  const savedRef = useRef<WidgetConfig>(EMPTY);
  const dirty = !same(config, savedRef.current);

  /* ---------------- Load ---------------- */

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      // Both are public reads, so they can run in parallel.
      const [cat, cfg] = await Promise.all([getWidgetCatalogue(signal), getWidgetConfig(signal)]);
      setCatalogue(cat.widgets);
      setConfig(cfg.value);
      savedRef.current = cfg.value;
      setSavedAt(cfg.updatedAt);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setLoadError(error instanceof Error ? error.message : 'Could not load the widget layout.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /** Warn before losing unsaved arrangement work. */
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const definitions = useMemo(
    () => new Map(catalogue.map((definition) => [definition.type, definition])),
    [catalogue],
  );

  /* ---------------- Mutations ---------------- */

  /** Which zone holds a widget id, and at what index. */
  const locate = useCallback(
    (id: string): { zone: WidgetZone; index: number } | null => {
      for (const zone of WIDGET_ZONES) {
        const index = config.zones[zone].findIndex((w) => w.id === id);
        if (index !== -1) return { zone, index };
      }
      return null;
    },
    [config],
  );

  const addWidget = useCallback(
    (definition: WidgetDefinition, zone: WidgetZone = 'left', index?: number) => {
      const widget = instantiateWidget(definition);
      setConfig((current) => {
        const list = [...current.zones[zone]];
        list.splice(index ?? list.length, 0, widget);
        return { zones: { ...current.zones, [zone]: list } };
      });
      // Open the new widget straight away: an admin who just added a Custom
      // HTML block almost certainly wants to type into it.
      setExpandedId(widget.id);
    },
    [],
  );

  const changeWidget = useCallback((id: string, patch: Partial<WidgetInstance>) => {
    setConfig((current) => {
      const zones = { ...current.zones };
      for (const zone of WIDGET_ZONES) {
        const index = zones[zone].findIndex((w) => w.id === id);
        if (index === -1) continue;
        const list = [...zones[zone]];
        const existing = list[index];
        // `noUncheckedIndexedAccess` types this as possibly undefined even
        // though findIndex just proved otherwise — guard rather than assert.
        if (!existing) continue;
        list[index] = { ...existing, ...patch };
        zones[zone] = list;
        break;
      }
      return { zones };
    });
  }, []);

  const removeWidget = useCallback((id: string) => {
    setConfig((current) => ({
      zones: {
        left: current.zones.left.filter((w) => w.id !== id),
        right: current.zones.right.filter((w) => w.id !== id),
      },
    }));
    setExpandedId((open) => (open === id ? null : open));
  }, []);

  /* ---------------- Drag handling ---------------- */

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // A few pixels of slack so a click on the handle is still a click.
      // Without it, every button press inside a draggable starts a drag.
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.kind === 'source') {
      setActiveDrag({ kind: 'source', definition: data.definition as WidgetDefinition });
    } else if (data?.kind === 'placed') {
      setActiveDrag({ kind: 'placed', widget: data.widget as WidgetInstance });
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null);

      const { active, over } = event;
      if (!over) return;

      const overId = String(over.id);
      const activeId = String(active.id);

      /*
       * Resolve the drop target into a concrete (zone, index).
       *
       * Dropping on the column itself appends; dropping on a card inserts at
       * that card's position. Both are needed: the column handles the empty
       * case and the gap below the last card, the card handles precise
       * placement between two existing widgets.
       */
      let targetZone: WidgetZone | null = null;
      let targetIndex: number | null = null;

      if (overId.startsWith('zone:')) {
        targetZone = overId.slice('zone:'.length) as WidgetZone;
      } else {
        const found = locate(overId);
        if (found) {
          targetZone = found.zone;
          targetIndex = found.index;
        }
      }

      if (!targetZone || !WIDGET_ZONES.includes(targetZone)) return;

      /* --- A new widget from the warehouse --- */
      if (activeId.startsWith('source:')) {
        const definition = active.data.current?.definition as WidgetDefinition | undefined;
        if (definition) addWidget(definition, targetZone, targetIndex ?? undefined);
        return;
      }

      /* --- Moving an already-placed widget --- */
      const from = locate(activeId);
      if (!from) return;

      // Reorder inside one zone.
      if (from.zone === targetZone) {
        const toIndex = targetIndex ?? config.zones[targetZone].length - 1;
        if (from.index === toIndex) return;
        setConfig((current) => ({
          zones: {
            ...current.zones,
            [targetZone]: arrayMove(current.zones[targetZone], from.index, toIndex),
          },
        }));
        return;
      }

      // Move across zones.
      setConfig((current) => {
        const source = [...current.zones[from.zone]];
        const [moved] = source.splice(from.index, 1);
        if (!moved) return current;

        const destination = [...current.zones[targetZone]];
        destination.splice(targetIndex ?? destination.length, 0, moved);

        return {
          zones: { ...current.zones, [from.zone]: source, [targetZone]: destination },
        };
      });
    },
    [addWidget, config, locate],
  );

  /* ---------------- Save ---------------- */

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { value } = await saveWidgetConfig(config);
      // Adopt the server's canonical document rather than keeping the local
      // one: it has been sanitised and its positions renumbered, so trusting
      // the local copy would leave the editor showing HTML the site will not
      // actually render.
      setConfig(value);
      savedRef.current = value;
      setSavedAt(new Date().toISOString());
      // The public site caches the config at module scope; drop it so a
      // visitor's next page load sees this arrangement.
      invalidateWidgetConfig();
    } catch (error) {
      setSaveError(
        error instanceof AdminApiError
          ? error.message
          : 'Could not save the layout. Check the connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  }, [config]);

  const handleDiscard = useCallback(() => {
    setConfig(savedRef.current);
    setExpandedId(null);
    setSaveError(null);
  }, []);

  /* ---------------- Render ---------------- */

  if (loading) return <LoadingBlock label="Loading the widget layout…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={() => void load()} />;

  const totalWidgets = config.zones.left.length + config.zones.right.length;

  return (
    <>
      <PageHeader
        title="Widget Customizer"
        subtitle="Arrange the sidebars around the transcriber. Drag from the warehouse, reorder, and save."
        actions={
          <>
            {dirty && (
              <Button variant="ghost" onClick={handleDiscard} disabled={saving}>
                Discard
              </Button>
            )}
            <Button onClick={() => void handleSave()} disabled={!dirty || saving}>
              {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </Button>
          </>
        }
      />

      {saveError && (
        <div className="mb-4">
          <ErrorState message={saveError} onRetry={() => void handleSave()} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>
          {totalWidgets} widget{totalWidgets === 1 ? '' : 's'} placed
        </span>
        {savedAt && <span>Last saved {new Date(savedAt).toLocaleString()}</span>}
        {dirty && <span className="text-amber-400">Unsaved changes</span>}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        <div className="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)_20rem]">
          {/* ---- Warehouse ---- */}
          <Card
            title="Widget Warehouse"
            description="Drag one into a zone, or use its Add button."
            className="self-start"
          >
            <div className="space-y-2">
              {catalogue.map((definition) => (
                <WarehouseItem
                  key={definition.type}
                  definition={definition}
                  onAdd={(d) => addWidget(d, 'left')}
                />
              ))}
            </div>
          </Card>

          {/* ---- Zones ---- */}
          <Card
            title="Sidebar Zones"
            description="Reorder with the grip handle. Drag between zones to move a widget."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {WIDGET_ZONES.map((zone) => (
                <DropZoneColumn
                  key={zone}
                  zone={zone}
                  title={ZONE_TITLES[zone]}
                  widgets={config.zones[zone]}
                  definitions={definitions}
                  expandedId={expandedId}
                  onToggleExpanded={(id) => setExpandedId((open) => (open === id ? null : id))}
                  onChangeWidget={changeWidget}
                  onRemoveWidget={removeWidget}
                />
              ))}
            </div>
          </Card>

          {/* ---- Live preview ---- */}
          <div className="self-start xl:sticky xl:top-20">
            <WidgetPreview config={config} />
          </div>
        </div>

        {/*
          DragOverlay renders the item under the cursor in a portal, outside
          the scrolling columns. Without it a card dragged out of an
          overflow-hidden panel would be clipped at the panel's edge.
        */}
        <DragOverlay dropAnimation={null}>
          {activeDrag?.kind === 'source' && (
            <div className="flex items-center gap-2 rounded-xl border border-brand-400/50 bg-slate-900 px-3 py-2 shadow-xl">
              <span className="text-brand-300">
                <WidgetIcon name={activeDrag.definition.icon} />
              </span>
              <span className="text-sm font-medium text-slate-200">
                {activeDrag.definition.name}
              </span>
            </div>
          )}
          {activeDrag?.kind === 'placed' && (
            <div className="flex items-center gap-2 rounded-xl border border-brand-400/50 bg-slate-900 px-3 py-2 shadow-xl">
              <span className="text-brand-300">
                <WidgetIcon name={definitions.get(activeDrag.widget.type)?.icon ?? 'text'} />
              </span>
              <span className="text-sm font-medium text-slate-200">
                {activeDrag.widget.title || activeDrag.widget.type}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
