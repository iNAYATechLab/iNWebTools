/**
 * Sidebar widget engine types.
 *
 * Shared by the public site (which renders the widgets), the admin customizer
 * (which arranges them) and the API client, so the three can never drift
 * apart silently.
 *
 * These mirror `server/services/widgets.service.js`. The server is the source
 * of truth for the *catalogue* — it ships the field schema at runtime — so
 * nothing here restates which fields a widget type has.
 */

/** Placement zones the website renders. */
export const WIDGET_ZONES = ['left', 'right'] as const;
export type WidgetZone = (typeof WIDGET_ZONES)[number];

/** Settings are per-type and schema-driven, so this stays deliberately open. */
export type WidgetSettings = Record<string, string | number | boolean>;

/** One placed widget. `position` mirrors array order; the server renumbers it. */
export type WidgetInstance = {
  id: string;
  type: string;
  title: string;
  settings: WidgetSettings;
  enabled: boolean;
  position: number;
};

export type WidgetConfig = {
  zones: Record<WidgetZone, WidgetInstance[]>;
};

export type WidgetConfigResponse = {
  value: WidgetConfig;
  updatedAt: string | null;
  updatedBy: string | null;
};

/* ---------------- Catalogue (the warehouse) ---------------- */

/** Form control the admin editor renders, and the rule the server enforces. */
export type WidgetFieldKind =
  'text' | 'textarea' | 'html' | 'url' | 'image' | 'number' | 'boolean' | 'select';

export type WidgetFieldSchema = {
  key: string;
  kind: WidgetFieldKind;
  label: string;
  default: string | number | boolean;
  help?: string;
  max?: number;
  min?: number;
  options?: Array<{ value: string; label: string }>;
};

export type WidgetDefinition = {
  type: string;
  name: string;
  description: string;
  icon: string;
  defaultTitle: string;
  fields: WidgetFieldSchema[];
};

export type WidgetCatalogue = {
  zones: WidgetZone[];
  widgets: WidgetDefinition[];
};

/* ---------------- Public stats ---------------- */

/**
 * Aggregate-only numbers for the live widgets. `online` and `totals` are null
 * when the database is unavailable, so widgets show a dash instead of vanishing.
 */
export type WidgetPublicStats = {
  model: string;
  version: string;
  uptimeSeconds: number;
  online: {
    total: number;
    mobile: number;
    desktop: number;
    tablet: number;
    countries: number;
    windowSeconds: number;
  } | null;
  totals: {
    conversions: number;
    successful: number;
    characters: number;
  } | null;
};

/* ---------------- Fallback ---------------- */

/**
 * Rendered when the config request fails outright. Empty rather than a guess:
 * the server already falls back to its own defaults, so reaching this means
 * the network is down, and inventing sidebar content then would be noise.
 */
export const EMPTY_WIDGET_CONFIG: WidgetConfig = {
  zones: { left: [], right: [] },
};

/** Stable client-side id for a newly dragged-in widget. */
export function newWidgetId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `w_${random}`;
}

/** Build a fresh instance of a catalogue type, using its declared defaults. */
export function instantiateWidget(definition: WidgetDefinition): WidgetInstance {
  return {
    id: newWidgetId(),
    type: definition.type,
    title: definition.defaultTitle,
    settings: Object.fromEntries(definition.fields.map((f) => [f.key, f.default])),
    enabled: true,
    position: 0,
  };
}
