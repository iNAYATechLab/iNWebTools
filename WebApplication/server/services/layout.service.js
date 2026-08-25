/**
 * Header/footer CMS — defaults, validation and persistence.
 *
 * The layout is stored as a single JSON document in `app_settings` under the
 * key `layout_header_footer`. One key rather than two keeps a save atomic: the
 * header and footer can never disagree about which revision they came from.
 *
 * Everything here treats the stored document as untrusted. It is written by an
 * authenticated admin, but it is rendered into every visitor's page, so a
 * mistake — or a compromised admin account — must not become a stored XSS.
 * `sanitiseLayout` is therefore applied on the way in *and* on the way out.
 */

import { query, queryOne, readJson } from '../db/index.js';

const SETTING_KEY = 'layout_header_footer';

/* ------------------------------------------------------------------ *
 * Limits
 *
 * Bounded so a single request cannot store an unbounded document that then
 * has to be parsed and shipped to every visitor.
 * ------------------------------------------------------------------ */

const LIMITS = {
  text: 200,
  longText: 500,
  url: 500,
  navLinks: 12,
  actionButtons: 4,
  footerColumns: 5,
  footerItems: 10,
  socialLinks: 10,
};

/** Button styles the frontend knows how to render. */
const BUTTON_VARIANTS = ['primary', 'ghost'];

/** Social platforms with an icon in the client. */
const SOCIAL_PLATFORMS = [
  'facebook',
  'x',
  'linkedin',
  'github',
  'youtube',
  'instagram',
  'email',
  'website',
];

/* ------------------------------------------------------------------ *
 * Sanitising primitives
 * ------------------------------------------------------------------ */

/** Trim, collapse control characters, and cap length. */
function str(value, max = LIMITS.text) {
  if (typeof value !== 'string') return '';
  // Strip C0/C1 control characters: they are invisible in an admin form but
  // can break out of attribute context in some renderers.
  //
  // The pattern is hoisted into its own statement so the eslint-disable
  // comment sits on the line it describes. Inline in the chain, Prettier
  // reflowed the call onto its own line and left the directive pointing at
  // `return value`, which disabled nothing and reported the regex anyway.
  // eslint-disable-next-line no-control-regex
  const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;
  return value.replace(CONTROL_CHARS, '').trim().slice(0, max);
}

function bool(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Accept only URLs that are safe to put in `href`/`src`.
 *
 * The danger is `javascript:` (and `data:`/`vbscript:`), which execute when a
 * visitor clicks. React escapes text but does NOT block a javascript: href, so
 * this check is the actual defence — not a formality.
 *
 * Allowed: absolute http/https, mailto:, tel:, and site-relative paths.
 */
function safeUrl(value, { allowEmpty = true } = {}) {
  const raw = str(value, LIMITS.url);
  if (!raw) return allowEmpty ? '' : '';

  // Relative paths and fragments never carry a scheme, so they are safe.
  if (raw.startsWith('/') || raw.startsWith('#') || raw.startsWith('?')) return raw;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    // Not parseable as absolute and not relative — reject rather than guess.
    return '';
  }

  const scheme = parsed.protocol.toLowerCase();
  if (scheme === 'http:' || scheme === 'https:' || scheme === 'mailto:' || scheme === 'tel:') {
    return raw;
  }
  return '';
}

/** Normalise an array: tolerate a non-array, cap the length, drop empties. */
function list(value, max, mapper) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).map(mapper).filter(Boolean);
}

function oneOf(value, allowed, fallback) {
  const v = str(value, 32).toLowerCase();
  return allowed.includes(v) ? v : fallback;
}

/* ------------------------------------------------------------------ *
 * Defaults
 *
 * What a fresh installation shows. These mirror the hard-coded markup the
 * components carried before the CMS existed, so enabling the CMS changes
 * nothing visually until an admin edits something.
 * ------------------------------------------------------------------ */

export const DEFAULT_LAYOUT = Object.freeze({
  header: {
    logoUrl: '',
    siteTitle: 'iNWebTools',
    tagline: '',
    navLinks: [],
    actionButtons: [],
    notice: { isVisible: false, text: '', linkLabel: '', linkUrl: '' },
    showStatusPill: true,
    showLocaleToggle: true,
  },
  footer: {
    copyrightText: '© {year} iNWebTools · Built with care by iNAYA TechLab',
    tagline: '',
    columns: [],
    socialLinks: [],
    newsletter: {
      enabled: false,
      heading: 'Stay in the loop',
      description: '',
      buttonLabel: 'Subscribe',
      placeholder: 'you@example.com',
    },
    showPrivacyNote: true,
  },
});

/* ------------------------------------------------------------------ *
 * Whole-document sanitiser
 * ------------------------------------------------------------------ */

export function sanitiseLayout(input) {
  const src = input && typeof input === 'object' ? input : {};
  const h = src.header && typeof src.header === 'object' ? src.header : {};
  const f = src.footer && typeof src.footer === 'object' ? src.footer : {};
  const d = DEFAULT_LAYOUT;

  const notice = h.notice && typeof h.notice === 'object' ? h.notice : {};
  const newsletter = f.newsletter && typeof f.newsletter === 'object' ? f.newsletter : {};

  return {
    header: {
      logoUrl: safeUrl(h.logoUrl),
      siteTitle: str(h.siteTitle) || d.header.siteTitle,
      tagline: str(h.tagline),
      navLinks: list(h.navLinks, LIMITS.navLinks, (item) => {
        const label = str(item?.label, 60);
        const url = safeUrl(item?.url);
        // A link with no label or no destination is noise — drop it.
        if (!label || !url) return null;
        return { label, url, newTab: bool(item?.newTab) };
      }),
      actionButtons: list(h.actionButtons, LIMITS.actionButtons, (item) => {
        const label = str(item?.label, 40);
        const url = safeUrl(item?.url);
        if (!label || !url) return null;
        return {
          label,
          url,
          variant: oneOf(item?.variant, BUTTON_VARIANTS, 'primary'),
          newTab: bool(item?.newTab),
        };
      }),
      notice: {
        isVisible: bool(notice.isVisible),
        text: str(notice.text, LIMITS.longText),
        linkLabel: str(notice.linkLabel, 60),
        linkUrl: safeUrl(notice.linkUrl),
      },
      showStatusPill: bool(h.showStatusPill, true),
      showLocaleToggle: bool(h.showLocaleToggle, true),
    },

    footer: {
      copyrightText: str(f.copyrightText, LIMITS.longText) || d.footer.copyrightText,
      tagline: str(f.tagline, LIMITS.longText),
      columns: list(f.columns, LIMITS.footerColumns, (col) => {
        const title = str(col?.title, 60);
        const items = list(col?.items, LIMITS.footerItems, (item) => {
          const label = str(item?.label, 60);
          const url = safeUrl(item?.url);
          if (!label || !url) return null;
          return { label, url, newTab: bool(item?.newTab) };
        });
        // Keep a titled column even when empty: the admin may be mid-edit.
        if (!title && items.length === 0) return null;
        return { title, items };
      }),
      socialLinks: list(f.socialLinks, LIMITS.socialLinks, (item) => {
        const url = safeUrl(item?.url);
        if (!url) return null;
        return {
          platform: oneOf(item?.platform, SOCIAL_PLATFORMS, 'website'),
          url,
          label: str(item?.label, 40),
        };
      }),
      newsletter: {
        enabled: bool(newsletter.enabled),
        heading: str(newsletter.heading, 80) || d.footer.newsletter.heading,
        description: str(newsletter.description, LIMITS.longText),
        buttonLabel: str(newsletter.buttonLabel, 40) || d.footer.newsletter.buttonLabel,
        placeholder: str(newsletter.placeholder, 60) || d.footer.newsletter.placeholder,
      },
      showPrivacyNote: bool(f.showPrivacyNote, true),
    },
  };
}

/* ------------------------------------------------------------------ *
 * Persistence
 * ------------------------------------------------------------------ */

/**
 * Read the stored layout, falling back to defaults.
 *
 * Sanitises on read as well as write: a document stored by an older, laxer
 * build must not be trusted just because it is already in the table.
 */
export async function getLayout() {
  const row = await queryOne(
    'SELECT setting_value, updated_at, updated_by FROM app_settings WHERE setting_key = ?',
    [SETTING_KEY],
  );

  if (!row) {
    return { value: sanitiseLayout(DEFAULT_LAYOUT), updatedAt: null, updatedBy: null };
  }

  // JSONB arrives already parsed; readJson tolerates both shapes.
  const parsed = readJson(row.setting_value, DEFAULT_LAYOUT);

  return {
    value: sanitiseLayout(parsed),
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/** Validate, store and return the canonical document. */
export async function saveLayout(input, username) {
  const value = sanitiseLayout(input);

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

export const LAYOUT_SETTING_KEY = SETTING_KEY;
export const LAYOUT_LIMITS = LIMITS;
export const LAYOUT_BUTTON_VARIANTS = BUTTON_VARIANTS;
export const LAYOUT_SOCIAL_PLATFORMS = SOCIAL_PLATFORMS;
