/**
 * Modular sidebar widget engine — catalogue, validation and persistence.
 *
 * The whole point of this module is that nothing about the sidebars is
 * hardcoded in a component. A sidebar is a stored document:
 *
 *   { zones: { left: Widget[], right: Widget[] } }
 *   Widget = { id, type, title, settings: {}, enabled, position }
 *
 * stored as one JSON row in `app_settings`, exactly like the header/footer CMS.
 * One key rather than one per zone keeps a save atomic: the two sidebars can
 * never disagree about which revision they came from.
 *
 * The type catalogue below is the single source of truth
 * ------------------------------------------------------
 * Each widget type declares its own settings *schema* — field key, kind,
 * label, default and limits. Three things are then derived from that one
 * declaration rather than restated:
 *
 *   1. Server-side sanitising (`sanitiseSettings`) walks the schema, so a new
 *      field is validated the moment it is declared.
 *   2. The admin settings editor renders its form from the schema shipped in
 *      the API response — no per-widget form code to write.
 *   3. The warehouse list in the admin UI is the catalogue itself.
 *
 * So adding a widget type is: add an entry here, add one React component to
 * the client registry. Nothing else changes. The client maps `type` to a
 * component and renders an "unknown widget" placeholder if a stored document
 * references a type this build does not know — a forward-compatibility escape
 * hatch, not an error.
 *
 * Trust model
 * -----------
 * This document is written by an authenticated admin and rendered into every
 * visitor's page, so it is treated as untrusted input on the way in *and* on
 * the way out. A mistake — or a compromised admin account — must not become a
 * stored XSS. The Custom HTML widget is the sharp edge and gets a real HTML
 * sanitiser with a strict allowlist, not a regex.
 */

import sanitizeHtml from 'sanitize-html';

import { query, queryOne, readJson } from '../db/index.js';

const SETTING_KEY = 'layout_sidebar_widgets';

/** The two placement zones the website renders. */
export const ZONES = ['left', 'right'];

/* ------------------------------------------------------------------ *
 * Limits
 *
 * Bounded so one request cannot store an unbounded document that then has to
 * be parsed and shipped to every visitor on first paint.
 * ------------------------------------------------------------------ */

const LIMITS = {
  widgetsPerZone: 12,
  id: 64,
  title: 80,
  text: 200,
  longText: 1000,
  html: 5000,
  url: 500,
};

/* ------------------------------------------------------------------ *
 * HTML sanitising
 *
 * The Custom HTML widget exists so an admin can drop in a promo block or a
 * formatted note. That is a stored-XSS surface by definition, so the output
 * goes through a parser-based sanitiser with an allowlist.
 *
 * Deliberately excluded: <script>, <style>, <iframe>, <object>, <form>,
 * <input>, and every event-handler attribute. `allowedSchemes` is what stops
 * `javascript:` in an href — React escapes text but happily renders a
 * javascript: URL, and this widget uses dangerouslySetInnerHTML, so this
 * function is the actual defence rather than a formality.
 * ------------------------------------------------------------------ */

const HTML_POLICY = {
  allowedTags: [
    'p',
    'br',
    'hr',
    'span',
    'div',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'mark',
    'small',
    'code',
    'pre',
    'blockquote',
    'ul',
    'ol',
    'li',
    'h3',
    'h4',
    'h5',
    'h6',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    // Any link that opens a new tab gets noopener: without it the opened page
    // can reach back through window.opener and navigate this one.
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target
        ? { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' }
        : { ...attribs, rel: 'nofollow' },
    }),
  },
};

/** Sanitise a fragment of admin-authored HTML, then cap its length. */
export function sanitiseHtmlFragment(value) {
  if (typeof value !== 'string' || !value) return '';
  return sanitizeHtml(value.slice(0, LIMITS.html * 2), HTML_POLICY).slice(0, LIMITS.html);
}

/* ------------------------------------------------------------------ *
 * Scalar sanitising primitives
 * ------------------------------------------------------------------ */

/** Trim, strip control characters, cap length. */
function str(value, max = LIMITS.text) {
  if (typeof value !== 'string') return '';
  // Invisible in an admin form, but can break out of attribute context in
  // some renderers. Hoisted so the eslint directive sits on the line it means.
  // eslint-disable-next-line no-control-regex
  const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;
  return value.replace(CONTROL_CHARS, '').trim().slice(0, max);
}

function bool(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function num(value, { min = 0, max = 100, fallback = 0 } = {}) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

/**
 * Accept only URLs safe to place in `href`/`src`.
 *
 * Allowed: absolute http/https, mailto:, tel:, site-relative paths, and — for
 * images only — `data:image/...` so an admin can paste a small inline logo.
 */
function safeUrl(value, { allowDataImage = false } = {}) {
  const raw = str(value, LIMITS.url);
  if (!raw) return '';

  // Relative paths and fragments carry no scheme, so nothing can execute.
  if (raw.startsWith('/') || raw.startsWith('#') || raw.startsWith('?')) return raw;

  if (allowDataImage && /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(raw)) {
    return raw;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    // Neither absolute nor relative — reject rather than guess.
    return '';
  }

  const scheme = parsed.protocol.toLowerCase();
  return ['http:', 'https:', 'mailto:', 'tel:'].includes(scheme) ? raw : '';
}

function oneOf(value, allowed, fallback) {
  const v = str(value, 40);
  return allowed.includes(v) ? v : fallback;
}

/**
 * Widget ids are generated by the client and used as React keys and drag ids.
 * Constrain the character set so an id can never be interpreted as anything
 * but an opaque token.
 */
function safeId(value) {
  const raw = str(value, LIMITS.id).replace(/[^a-zA-Z0-9_-]/g, '');
  return raw || null;
}

/* ------------------------------------------------------------------ *
 * The widget type catalogue
 *
 * `kind` drives both validation here and the form control the admin editor
 * renders. Supported kinds: text | textarea | html | url | image | number |
 * boolean | select.
 * ------------------------------------------------------------------ */

/** @type {Record<string, { type: string, name: string, description: string, icon: string, defaultTitle: string, singleton?: boolean, fields: Array<object> }>} */
export const WIDGET_CATALOGUE = Object.freeze({
  text_html: {
    type: 'text_html',
    name: 'Custom Text / HTML',
    description: 'A free-form block of rich text or sanitised HTML.',
    icon: 'text',
    defaultTitle: 'About this tool',
    fields: [
      {
        key: 'body',
        kind: 'html',
        label: 'Content (HTML allowed)',
        default:
          '<p>Drop any note, promo or announcement here. A safe subset of HTML is allowed.</p>',
        max: LIMITS.html,
        help: 'Scripts, iframes, styles and event handlers are stripped on save.',
      },
      {
        key: 'align',
        kind: 'select',
        label: 'Text alignment',
        default: 'left',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
      },
    ],
  },

  image_banner: {
    type: 'image_banner',
    name: 'Image / Ad Banner',
    description: 'A clickable image — sponsor slot, promo art or a screenshot.',
    icon: 'image',
    defaultTitle: 'Sponsored',
    fields: [
      {
        key: 'imageUrl',
        kind: 'image',
        label: 'Image URL',
        default: '',
        max: LIMITS.url,
        help: 'https://… or a site-relative /path. Small data: images are accepted.',
      },
      { key: 'alt', kind: 'text', label: 'Alt text', default: 'Banner', max: LIMITS.text },
      {
        key: 'linkUrl',
        kind: 'url',
        label: 'Link target (optional)',
        default: '',
        max: LIMITS.url,
      },
      { key: 'newTab', kind: 'boolean', label: 'Open link in a new tab', default: true },
      { key: 'caption', kind: 'text', label: 'Caption (optional)', default: '', max: LIMITS.text },
      {
        key: 'rounded',
        kind: 'boolean',
        label: 'Rounded corners',
        default: true,
      },
    ],
  },

  online_users: {
    type: 'online_users',
    name: 'Live Online Users',
    description: 'A live counter of visitors active on the site right now.',
    icon: 'users',
    defaultTitle: 'Online now',
    fields: [
      {
        key: 'refreshSeconds',
        kind: 'number',
        label: 'Refresh interval (seconds)',
        default: 30,
        min: 10,
        max: 600,
        help: 'How often the counter re-polls. Lower values cost more requests.',
      },
      {
        key: 'showDeviceBreakdown',
        kind: 'boolean',
        label: 'Show device breakdown',
        default: true,
      },
      { key: 'showCountries', kind: 'boolean', label: 'Show country count', default: true },
    ],
  },

  recent_transcriptions: {
    type: 'recent_transcriptions',
    name: 'Recent Transcriptions',
    description: "This visitor's own recent transcriptions, stored in their browser.",
    icon: 'history',
    defaultTitle: 'Your recent files',
    fields: [
      {
        key: 'maxItems',
        kind: 'number',
        label: 'Items to show',
        default: 5,
        min: 1,
        max: 20,
      },
      { key: 'showPreview', kind: 'boolean', label: 'Show a text preview', default: true },
      {
        key: 'emptyText',
        kind: 'text',
        label: 'Text when there is no history',
        default: 'Your transcriptions will appear here.',
        max: LIMITS.text,
      },
    ],
  },

  quick_tools: {
    type: 'quick_tools',
    name: 'Quick Tools & Language',
    description: 'Interface language switch, audio language shortcuts and quick links.',
    icon: 'tools',
    defaultTitle: 'Quick tools',
    fields: [
      {
        key: 'showLocaleToggle',
        kind: 'boolean',
        label: 'Interface language switch',
        default: true,
      },
      {
        key: 'showAudioLanguages',
        kind: 'boolean',
        label: 'Audio language shortcuts',
        default: true,
      },
      {
        key: 'languageCodes',
        kind: 'text',
        label: 'Shortcut language codes',
        default: 'auto,bn,en,hi,ar',
        max: LIMITS.text,
        help: 'Comma-separated ISO codes, in the order they should appear.',
      },
      { key: 'showCopyLink', kind: 'boolean', label: 'Show "copy page link"', default: true },
    ],
  },

  system_stats: {
    type: 'system_stats',
    name: 'System Stats',
    description: 'Model in use, uptime and transcription volume.',
    icon: 'stats',
    defaultTitle: 'System status',
    fields: [
      { key: 'showModel', kind: 'boolean', label: 'Show the active ASR model', default: true },
      { key: 'showUptime', kind: 'boolean', label: 'Show server uptime', default: true },
      { key: 'showTotals', kind: 'boolean', label: 'Show transcription totals', default: true },
      {
        key: 'refreshSeconds',
        kind: 'number',
        label: 'Refresh interval (seconds)',
        default: 60,
        min: 15,
        max: 600,
      },
    ],
  },
});

export const WIDGET_TYPES = Object.keys(WIDGET_CATALOGUE);

/** Field defaults for a type, as a plain settings object. */
export function defaultSettingsFor(type) {
  const definition = WIDGET_CATALOGUE[type];
  if (!definition) return {};
  return Object.fromEntries(definition.fields.map((f) => [f.key, f.default]));
}

/* ------------------------------------------------------------------ *
 * Settings sanitising, driven by the schema
 * ------------------------------------------------------------------ */

/**
 * Validate one widget's settings against its declared schema.
 *
 * Unknown keys are dropped rather than passed through: the stored document is
 * rendered into every page, and an attribute nobody declared is an attribute
 * nobody validated. Missing keys fall back to the declared default, so an
 * older stored document gains new fields automatically.
 */
function sanitiseSettings(type, input) {
  const definition = WIDGET_CATALOGUE[type];
  if (!definition) return {};

  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const out = {};

  for (const field of definition.fields) {
    const raw = src[field.key];
    const fallback = field.default;

    switch (field.kind) {
      case 'html':
        out[field.key] =
          raw === undefined ? sanitiseHtmlFragment(fallback) : sanitiseHtmlFragment(raw);
        break;
      case 'textarea':
        out[field.key] = raw === undefined ? fallback : str(raw, field.max ?? LIMITS.longText);
        break;
      case 'text':
        out[field.key] = raw === undefined ? fallback : str(raw, field.max ?? LIMITS.text);
        break;
      case 'url':
        out[field.key] = raw === undefined ? fallback : safeUrl(raw);
        break;
      case 'image':
        out[field.key] = raw === undefined ? fallback : safeUrl(raw, { allowDataImage: true });
        break;
      case 'number':
        out[field.key] = num(raw, {
          min: field.min ?? 0,
          max: field.max ?? 1000,
          fallback,
        });
        break;
      case 'boolean':
        out[field.key] = bool(raw, fallback);
        break;
      case 'select':
        out[field.key] = oneOf(
          raw,
          (field.options ?? []).map((o) => o.value),
          fallback,
        );
        break;
      default:
        // An unrecognised kind means the catalogue and this switch disagree.
        // Fail closed to the default rather than storing unvalidated input.
        out[field.key] = fallback;
    }
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Whole-document sanitiser
 * ------------------------------------------------------------------ */

/**
 * Normalise an arbitrary payload into a canonical widget document.
 *
 * Also enforces two invariants the UI relies on:
 *   - ids are unique across *both* zones (they are React keys and drag ids;
 *     a duplicate would make two widgets move as one)
 *   - `position` is renumbered 0..n-1 from array order, so the array order and
 *     the stored positions can never disagree
 */
export function sanitiseWidgetConfig(input) {
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const zonesIn = src.zones && typeof src.zones === 'object' ? src.zones : {};

  const seenIds = new Set();
  const zones = {};

  for (const zone of ZONES) {
    const list = Array.isArray(zonesIn[zone]) ? zonesIn[zone] : [];
    const widgets = [];

    for (const raw of list) {
      if (widgets.length >= LIMITS.widgetsPerZone) break;
      if (!raw || typeof raw !== 'object') continue;

      const type = str(raw.type, 40);
      if (!WIDGET_TYPES.includes(type)) continue; // unknown type — drop it

      let id = safeId(raw.id);
      if (!id || seenIds.has(id)) {
        // Mint a replacement rather than rejecting the save: an id collision
        // is a client bug, and losing the admin's whole layout over it would
        // be a worse outcome than silently renaming one widget.
        id = `w_${Math.random().toString(36).slice(2, 10)}`;
      }
      seenIds.add(id);

      widgets.push({
        id,
        type,
        title: str(raw.title, LIMITS.title),
        settings: sanitiseSettings(type, raw.settings),
        enabled: bool(raw.enabled, true),
        position: widgets.length,
      });
    }

    zones[zone] = widgets;
  }

  return { zones };
}

/* ------------------------------------------------------------------ *
 * Defaults
 *
 * What a fresh installation shows before an admin touches anything. Chosen so
 * the sidebars look intentional out of the box rather than empty.
 * ------------------------------------------------------------------ */

const seed = (id, type, title, overrides = {}) => ({
  id,
  type,
  title,
  settings: { ...defaultSettingsFor(type), ...overrides },
  enabled: true,
  position: 0,
});

export const DEFAULT_WIDGET_CONFIG = Object.freeze(
  sanitiseWidgetConfig({
    zones: {
      left: [
        seed('w_online_seed', 'online_users', 'Online now'),
        seed('w_tools_seed', 'quick_tools', 'Quick tools'),
      ],
      right: [
        seed('w_stats_seed', 'system_stats', 'System status'),
        seed('w_history_seed', 'recent_transcriptions', 'Your recent files'),
      ],
    },
  }),
);

/* ------------------------------------------------------------------ *
 * Persistence
 * ------------------------------------------------------------------ */

/**
 * Read the stored document, falling back to defaults.
 *
 * Sanitises on read as well as write: a document written by an older, laxer
 * build must not be trusted just because it is already in the table.
 */
export async function getWidgetConfig() {
  const row = await queryOne(
    'SELECT setting_value, updated_at, updated_by FROM app_settings WHERE setting_key = ?',
    [SETTING_KEY],
  );

  if (!row) {
    return { value: DEFAULT_WIDGET_CONFIG, updatedAt: null, updatedBy: null };
  }

  const parsed = readJson(row.setting_value, DEFAULT_WIDGET_CONFIG);

  return {
    value: sanitiseWidgetConfig(parsed),
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/** Validate, store and return the canonical document. */
export async function saveWidgetConfig(input, username) {
  const value = sanitiseWidgetConfig(input);

  await query(
    `INSERT INTO app_settings (setting_key, setting_value, updated_by)
     VALUES (?, ?, ?)
     ON CONFLICT (setting_key) DO UPDATE SET
       setting_value = excluded.setting_value,
       updated_by    = excluded.updated_by,
       updated_at    = CURRENT_TIMESTAMP`,
    [SETTING_KEY, JSON.stringify(value), username ?? null],
  );

  return value;
}

export const WIDGET_SETTING_KEY = SETTING_KEY;
export const WIDGET_LIMITS = LIMITS;
