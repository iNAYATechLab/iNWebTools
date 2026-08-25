/**
 * Category Manager — /AdminDashboard/CMS/Categories
 *
 * Edit category and sub-category names, icons, descriptions, visibility and
 * ordering. Reordering is drag-and-drop, reusing the dnd-kit setup the Widget
 * Customizer already established.
 *
 * What is intentionally NOT editable: the slug.
 * ---------------------------------------------
 * A slug is in the public URL (/tools/pdf-document-tools/...). Changing one
 * breaks every inbound link and every indexed search result for that page, and
 * the whole reason this URL structure exists is search visibility. The server
 * returns 400 SLUG_IMMUTABLE if a client tries, and the UI shows the slug as
 * read-only text so the constraint is visible rather than surprising.
 *
 * Save model
 * ----------
 * Field edits save per row on demand; reordering saves immediately on drop.
 * They are separate because they are different operations with different
 * failure modes — a rename is a single-row PATCH, a reorder is a transaction
 * across many rows, and batching them would make a failed rename roll back an
 * unrelated reorder.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { CategoryIcon } from '../../../components/categories/CategoryIcon';
import { invalidateCategories } from '../../../hooks/useCategories';
import {
  AdminApiError,
  getAdminCategoryTree,
  reorderCategories,
  updateCategory,
  updateSubcategory,
} from '../../../services/adminApi';
import type { Category, Subcategory } from '../../../types/categories';
import { Field, Select, TextArea, TextInput, Toggle } from '../components/form';
import { Button, Card, ErrorState, LoadingBlock, PageHeader } from '../components/ui';

/** Must match CATEGORY_ICONS in categories.service.js. */
const ICON_OPTIONS = [
  'file-text',
  'image',
  'play',
  'code',
  'type',
  'calculator',
  'shield',
  'sparkle',
  'grid',
  'star',
  'wrench',
  'globe',
].map((value) => ({ value, label: value }));

/* ------------------------------------------------------------------ *
 * Sortable row
 * ------------------------------------------------------------------ */

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handle: React.ReactNode, dragging: boolean) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const handle = (
    <button
      type="button"
      {...listeners}
      {...attributes}
      aria-label="Reorder"
      className="cursor-grab touch-none rounded p-1 text-slate-600 transition-colors hover:bg-white/5 hover:text-slate-300 active:cursor-grabbing"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9-13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm1 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
      </svg>
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? 'relative z-10 opacity-60' : undefined}
    >
      {children(handle, isDragging)}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Editors
 * ------------------------------------------------------------------ */

function SubcategoryRow({
  sub,
  handle,
  onSaved,
}: {
  sub: Subcategory;
  handle: React.ReactNode;
  onSaved: (updated: Subcategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: sub.name,
    description: sub.description,
    isActive: sub.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync when the row is replaced by a fresh fetch.
  useEffect(() => {
    setDraft({ name: sub.name, description: sub.description, isActive: sub.isActive });
  }, [sub]);

  const dirty =
    draft.name !== sub.name ||
    draft.description !== sub.description ||
    draft.isActive !== sub.isActive;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { subcategory } = await updateSubcategory(sub.id, draft);
      onSaved(subcategory);
      setOpen(false);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/40">
      <div className="flex items-center gap-1.5 p-2">
        {handle}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-xs font-medium text-slate-200">{sub.name}</p>
          <p className="truncate font-mono text-[10px] text-slate-600">{sub.slug}</p>
        </button>
        {!sub.isActive && (
          <span className="shrink-0 rounded border border-amber-400/30 px-1.5 py-0.5 text-[9px] uppercase text-amber-300">
            Hidden
          </span>
        )}
        <span className="shrink-0 text-[10px] tabular-nums text-slate-600">#{sub.sortOrder}</span>
      </div>

      {open && (
        <div className="border-t border-white/10 p-3">
          <Field label="Name" htmlFor={`sub-${sub.id}-name`}>
            <TextInput
              id={`sub-${sub.id}-name`}
              value={draft.name}
              onChange={(name) => setDraft((d) => ({ ...d, name }))}
              maxLength={80}
            />
          </Field>

          <Field label="Description" htmlFor={`sub-${sub.id}-desc`}>
            <TextArea
              id={`sub-${sub.id}-desc`}
              value={draft.description}
              onChange={(description) => setDraft((d) => ({ ...d, description }))}
              maxLength={300}
              rows={2}
            />
          </Field>

          <Field
            label="URL slug"
            hint="Part of the public URL — permanent, so it cannot be changed."
          >
            <p className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 font-mono text-xs text-slate-500">
              {sub.slug}
            </p>
          </Field>

          <Toggle
            label="Visible on the site"
            hint="Hidden sub-categories stay in the registry but disappear from navigation."
            checked={draft.isActive}
            onChange={(isActive) => setDraft((d) => ({ ...d, isActive }))}
          />

          {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}

          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  category,
  handle,
  onSaved,
  onSubSaved,
  onSubReorder,
}: {
  category: Category;
  handle: React.ReactNode;
  onSaved: (updated: Category) => void;
  onSubSaved: (categoryId: string, updated: Subcategory) => void;
  onSubReorder: (categoryId: string, subs: Subcategory[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: category.name,
    description: category.description,
    icon: category.icon,
    isActive: category.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft({
      name: category.name,
      description: category.description,
      icon: category.icon,
      isActive: category.isActive,
    });
  }, [category]);

  const dirty =
    draft.name !== category.name ||
    draft.description !== category.description ||
    draft.icon !== category.icon ||
    draft.isActive !== category.isActive;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { category: updated } = await updateCategory(category.id, draft);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = category.subcategories.findIndex((s) => s.id === active.id);
    const newIndex = category.subcategories.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(category.subcategories, oldIndex, newIndex).map((s, i) => ({
      ...s,
      sortOrder: i + 1,
    }));

    // Optimistic: the drop already animated, so waiting on the round trip
    // would make the row visibly snap back and forth.
    onSubReorder(category.id, next);
    try {
      await reorderCategories(
        'subcategory',
        next.map((s) => ({ id: s.id, sortOrder: s.sortOrder })),
      );
    } catch {
      // Left in place deliberately: the next load reconciles from the server.
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-2 p-3">
        {handle}
        <span className="shrink-0 rounded-lg border border-brand-400/20 bg-brand-500/10 p-1.5 text-brand-300">
          <CategoryIcon name={category.icon} className="h-4 w-4" />
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-medium text-slate-200">{category.name}</p>
          <p className="truncate font-mono text-[10px] text-slate-600">/tools/{category.slug}</p>
        </button>
        {!category.isActive && (
          <span className="shrink-0 rounded border border-amber-400/30 px-1.5 py-0.5 text-[9px] uppercase text-amber-300">
            Hidden
          </span>
        )}
        <span className="shrink-0 text-[10px] text-slate-600">
          {category.subcategories.length} subs · #{category.sortOrder}
        </span>
      </div>

      {open && (
        <div className="space-y-4 border-t border-white/10 p-3">
          <div>
            <Field label="Name" htmlFor={`cat-${category.id}-name`}>
              <TextInput
                id={`cat-${category.id}-name`}
                value={draft.name}
                onChange={(name) => setDraft((d) => ({ ...d, name }))}
                maxLength={80}
              />
            </Field>

            <Field label="Description" htmlFor={`cat-${category.id}-desc`}>
              <TextArea
                id={`cat-${category.id}-desc`}
                value={draft.description}
                onChange={(description) => setDraft((d) => ({ ...d, description }))}
                maxLength={300}
                rows={2}
              />
            </Field>

            <Field label="Icon" htmlFor={`cat-${category.id}-icon`}>
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded-lg border border-white/10 p-2 text-brand-300">
                  <CategoryIcon name={draft.icon} className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <Select
                    id={`cat-${category.id}-icon`}
                    value={draft.icon}
                    onChange={(icon) => setDraft((d) => ({ ...d, icon }))}
                    options={ICON_OPTIONS}
                  />
                </div>
              </div>
            </Field>

            <Field
              label="URL slug"
              hint="Part of the public URL — permanent, so it cannot be changed."
            >
              <p className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 font-mono text-xs text-slate-500">
                /tools/{category.slug}
              </p>
            </Field>

            <Toggle
              label="Visible on the site"
              hint="Hidden categories stay in the registry but disappear from navigation."
              checked={draft.isActive}
              onChange={(isActive) => setDraft((d) => ({ ...d, isActive }))}
            />

            {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}

            <div className="mt-3">
              <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
                {saving ? 'Saving…' : 'Save category'}
              </Button>
            </div>
          </div>

          {category.subcategories.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Sub-categories — drag to reorder
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => void handleSubDragEnd(e)}
              >
                <SortableContext
                  items={category.subcategories.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1.5">
                    {category.subcategories.map((sub) => (
                      <SortableRow key={sub.id} id={sub.id}>
                        {(subHandle) => (
                          <SubcategoryRow
                            sub={sub}
                            handle={subHandle}
                            onSaved={(updated) => onSubSaved(category.id, updated)}
                          />
                        )}
                      </SortableRow>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { categories: tree } = await getAdminCategoryTree(signal);
      setCategories(tree);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const totals = useMemo(
    () => ({
      categories: categories.length,
      subcategories: categories.reduce((sum, c) => sum + c.subcategories.length, 0),
    }),
    [categories],
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(categories, oldIndex, newIndex).map((c, i) => ({
      ...c,
      sortOrder: i + 1,
    }));

    setCategories(next);
    try {
      await reorderCategories(
        'category',
        next.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
      );
      // The public tree is cached at module scope; drop it so visitors see
      // the new order on their next navigation.
      invalidateCategories();
    } catch {
      void load();
    }
  };

  if (loading) return <LoadingBlock label="Loading categories…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <>
      <PageHeader
        title="Category Manager"
        subtitle="Edit names, icons, descriptions and ordering. Drag a row to reorder."
        actions={
          <Button variant="ghost" onClick={() => void load()}>
            Reload
          </Button>
        }
      />

      <p className="mb-4 text-[11px] text-slate-500">
        {totals.categories} categories · {totals.subcategories} sub-categories
      </p>

      <Card
        title="Main categories"
        description="Drag to reorder. Click a row to edit it and its sub-categories."
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => void handleDragEnd(e)}
        >
          <SortableContext
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {categories.map((category) => (
                <SortableRow key={category.id} id={category.id}>
                  {(handle) => (
                    <CategoryCard
                      category={category}
                      handle={handle}
                      onSaved={(updated) => {
                        setCategories((current) =>
                          current.map((c) =>
                            c.id === updated.id
                              ? { ...updated, subcategories: c.subcategories }
                              : c,
                          ),
                        );
                        invalidateCategories();
                      }}
                      onSubSaved={(categoryId, updated) => {
                        setCategories((current) =>
                          current.map((c) =>
                            c.id === categoryId
                              ? {
                                  ...c,
                                  subcategories: c.subcategories.map((s) =>
                                    s.id === updated.id ? { ...s, ...updated } : s,
                                  ),
                                }
                              : c,
                          ),
                        );
                        invalidateCategories();
                      }}
                      onSubReorder={(categoryId, subs) => {
                        setCategories((current) =>
                          current.map((c) =>
                            c.id === categoryId ? { ...c, subcategories: subs } : c,
                          ),
                        );
                        invalidateCategories();
                      }}
                    />
                  )}
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </Card>
    </>
  );
}
