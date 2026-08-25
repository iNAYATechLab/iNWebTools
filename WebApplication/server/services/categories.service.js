/**
 * Category registry — seeding, reading and admin editing.
 *
 * The taxonomy behind ~1,070 tools: 8 main categories, 25 sub-categories, and
 * the URL structure they drive:
 *
 *   /tools/:categorySlug
 *   /tools/:categorySlug/:subcategorySlug
 *   /tools/:categorySlug/:subcategorySlug/:toolSlug
 *
 * File seed, database truth
 * -------------------------
 * `config/categories.json` is the seed. On startup it is synced into the
 * `categories` and `subcategories` tables; from then on the database is the
 * source of truth and admins edit through the CMS.
 *
 * That split is deliberate. A file alone means an operator cannot rename a
 * category without a deploy. A database alone means a fresh installation comes
 * up with no navigation at all, and the structure is invisible to code review.
 * Seeding from a file and editing in the database gives both.
 *
 * The sync is **additive and non-destructive**: it inserts rows that are
 * missing and never updates or deletes existing ones. Re-running it on every
 * boot must not silently revert an admin's rename — that would be a data-loss
 * bug that only shows up after a restart, which is the worst kind.
 *
 * Slugs are permanent
 * -------------------
 * A slug is in the URL, so changing one breaks every inbound link and every
 * indexed search result for that page. The admin API therefore lets an admin
 * edit the *name*, icon, description and ordering, but **not** the slug. That
 * is not an oversight; renaming "PDF Converters" to "PDF Conversion Tools"
 * should not 404 every link that ever pointed at it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { query, queryOne } from '../db/index.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, '..', 'config', 'categories.json');

/* ------------------------------------------------------------------ *
 * Limits
 * ------------------------------------------------------------------ */

const LIMITS = {
  name: 80,
  description: 300,
  icon: 40,
  slug: 80,
};

/** Slug rule, mirroring the CHECK constraint in schema.sql. */
const SLUG_RX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Icon keys the client has a glyph for. Anything else falls back. */
export const CATEGORY_ICONS = [
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
];

/* ------------------------------------------------------------------ *
 * Sanitising
 * ------------------------------------------------------------------ */

function str(value, max) {
  if (typeof value !== 'string') return '';
  // Control characters are invisible in an admin form but can break out of
  // attribute context in some renderers.
  // eslint-disable-next-line no-control-regex
  const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;
  return value.replace(CONTROL_CHARS, '').trim().slice(0, max);
}

function bool(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function int(value, { min = 0, max = 9999, fallback = 0 } = {}) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

/** Icon must be a key the client knows, or the UI renders nothing at all. */
function icon(value, fallback = 'grid') {
  const raw = str(value, LIMITS.icon);
  return CATEGORY_ICONS.includes(raw) ? raw : fallback;
}

/* ------------------------------------------------------------------ *
 * Seed
 * ------------------------------------------------------------------ */

/** Read and validate the seed file. Throws on a malformed registry. */
export function readSeed() {
  const raw = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  const categories = Array.isArray(raw.categories) ? raw.categories : [];

  const seenCategory = new Set();

  for (const category of categories) {
    if (!SLUG_RX.test(category.slug ?? '')) {
      throw new Error(`Invalid category slug in seed: ${category.slug}`);
    }
    if (seenCategory.has(category.slug)) {
      throw new Error(`Duplicate category slug in seed: ${category.slug}`);
    }
    seenCategory.add(category.slug);

    const seenSub = new Set();
    for (const sub of category.subcategories ?? []) {
      if (!SLUG_RX.test(sub.slug ?? '')) {
        throw new Error(`Invalid subcategory slug in seed: ${sub.slug}`);
      }
      // Only unique per parent: /pdf-…/converters and /image-…/converters are
      // both legitimate, which is why the DB constraint is (category_id, slug).
      if (seenSub.has(sub.slug)) {
        throw new Error(`Duplicate subcategory slug under ${category.slug}: ${sub.slug}`);
      }
      seenSub.add(sub.slug);
    }
  }

  return { version: raw.version ?? 1, categories };
}

/**
 * Insert any seed rows that are not in the database yet.
 *
 * Non-destructive by design — see the module comment. `ON CONFLICT DO NOTHING`
 * is what makes this safe to run on every boot.
 *
 * @returns {Promise<{ categories: number, subcategories: number }>} rows inserted
 */
export async function syncSeed() {
  const { categories } = readSeed();
  let insertedCategories = 0;
  let insertedSubcategories = 0;

  for (const category of categories) {
    const result = await query(
      `INSERT INTO categories (slug, name, description, icon, sort_order)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (slug) DO NOTHING`,
      [
        category.slug,
        str(category.name, LIMITS.name),
        str(category.description, LIMITS.description) || null,
        icon(category.icon),
        int(category.sortOrder),
      ],
    );
    if (result?.affectedRows) insertedCategories += 1;

    // Re-read rather than relying on RETURNING: the row may already exist from
    // an earlier run, in which case the INSERT touched nothing.
    const row = await queryOne('SELECT id FROM categories WHERE slug = ?', [category.slug]);
    if (!row) continue;

    for (const sub of category.subcategories ?? []) {
      const subResult = await query(
        `INSERT INTO subcategories (category_id, slug, name, description, sort_order)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (category_id, slug) DO NOTHING`,
        [
          row.id,
          sub.slug,
          str(sub.name, LIMITS.name),
          str(sub.description, LIMITS.description) || null,
          int(sub.sortOrder),
        ],
      );
      if (subResult?.affectedRows) insertedSubcategories += 1;
    }
  }

  if (insertedCategories || insertedSubcategories) {
    logger.info('Category registry seeded', {
      categories: insertedCategories,
      subcategories: insertedSubcategories,
    });
  }

  return { categories: insertedCategories, subcategories: insertedSubcategories };
}

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

/** Shape a database row for the API. camelCase; the client never sees snake_case. */
const shapeCategory = (row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description ?? '',
  icon: row.icon ?? 'grid',
  sortOrder: row.sort_order,
  isActive: row.is_active,
  toolCount: Number(row.tool_count ?? 0),
  subcategories: [],
});

const shapeSubcategory = (row) => ({
  id: row.id,
  categoryId: row.category_id,
  slug: row.slug,
  name: row.name,
  description: row.description ?? '',
  sortOrder: row.sort_order,
  isActive: row.is_active,
  toolCount: Number(row.tool_count ?? 0),
});

/**
 * The whole tree, ordered, with published-tool counts.
 *
 * Two queries and an in-memory join rather than one query with a nested
 * aggregate: the tree is small (8 + 25 rows) and read on nearly every page, so
 * two simple indexed reads are cheaper and far easier to reason about than a
 * correlated subquery, and the shape stays obvious.
 *
 * @param {{ includeInactive?: boolean }} options
 */
export async function getCategoryTree({ includeInactive = false } = {}) {
  const activeFilter = includeInactive ? '' : 'WHERE c.is_active = TRUE';

  const categories = await query(
    `SELECT c.id, c.slug, c.name, c.description, c.icon, c.sort_order, c.is_active,
            (SELECT COUNT(*) FROM tools t
              WHERE t.category_id = c.id AND t.status = 'published') AS tool_count
       FROM categories c
       ${activeFilter}
      ORDER BY c.sort_order, c.name`,
  );

  const subFilter = includeInactive ? '' : 'WHERE s.is_active = TRUE';

  const subcategories = await query(
    `SELECT s.id, s.category_id, s.slug, s.name, s.description, s.sort_order, s.is_active,
            (SELECT COUNT(*) FROM tools t
              WHERE t.subcategory_id = s.id AND t.status = 'published') AS tool_count
       FROM subcategories s
       ${subFilter}
      ORDER BY s.sort_order, s.name`,
  );

  const tree = categories.map(shapeCategory);
  const byId = new Map(tree.map((c) => [c.id, c]));

  for (const row of subcategories) {
    byId.get(row.category_id)?.subcategories.push(shapeSubcategory(row));
  }

  return tree;
}

/** One category by slug, with its subcategories. Null when unknown. */
export async function getCategoryBySlug(slug, { includeInactive = false } = {}) {
  const row = await queryOne(
    `SELECT id, slug, name, description, icon, sort_order, is_active
       FROM categories
      WHERE slug = ?${includeInactive ? '' : ' AND is_active = TRUE'}`,
    [str(slug, LIMITS.slug)],
  );
  if (!row) return null;

  const category = shapeCategory(row);

  const subs = await query(
    `SELECT s.id, s.category_id, s.slug, s.name, s.description, s.sort_order, s.is_active,
            (SELECT COUNT(*) FROM tools t
              WHERE t.subcategory_id = s.id AND t.status = 'published') AS tool_count
       FROM subcategories s
      WHERE s.category_id = ?${includeInactive ? '' : ' AND s.is_active = TRUE'}
      ORDER BY s.sort_order, s.name`,
    [row.id],
  );

  category.subcategories = subs.map(shapeSubcategory);
  return category;
}

/**
 * One subcategory, resolved *through* its parent slug.
 *
 * The parent is part of the lookup rather than an afterthought because
 * subcategory slugs are only unique per category. Resolving on the child slug
 * alone would be ambiguous the moment two categories both have "converters",
 * and it would also let /tools/image-graphics-tools/pdf-converters resolve —
 * a URL that should 404, because that pairing does not exist.
 */
export async function getSubcategoryBySlug(categorySlug, subcategorySlug) {
  return queryOne(
    `SELECT s.id, s.category_id, s.slug, s.name, s.description, s.sort_order, s.is_active,
            c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon
       FROM subcategories s
       JOIN categories c ON c.id = s.category_id
      WHERE c.slug = ? AND s.slug = ?
        AND c.is_active = TRUE AND s.is_active = TRUE`,
    [str(categorySlug, LIMITS.slug), str(subcategorySlug, LIMITS.slug)],
  );
}

/* ------------------------------------------------------------------ *
 * Admin writes
 * ------------------------------------------------------------------ */

/**
 * Update a category's editable fields.
 *
 * `slug` is deliberately absent from this list — see the module comment. Only
 * the keys actually present in `patch` are written, so a partial update cannot
 * blank a field the caller did not mention.
 */
export async function updateCategory(id, patch) {
  const sets = [];
  const params = [];

  if (patch.name !== undefined) {
    const name = str(patch.name, LIMITS.name);
    if (!name) throw new Error('A category name cannot be empty.');
    sets.push('name = ?');
    params.push(name);
  }
  if (patch.description !== undefined) {
    sets.push('description = ?');
    params.push(str(patch.description, LIMITS.description) || null);
  }
  if (patch.icon !== undefined) {
    sets.push('icon = ?');
    params.push(icon(patch.icon));
  }
  if (patch.sortOrder !== undefined) {
    sets.push('sort_order = ?');
    params.push(int(patch.sortOrder));
  }
  if (patch.isActive !== undefined) {
    sets.push('is_active = ?');
    params.push(bool(patch.isActive));
  }

  if (sets.length === 0) return null;

  params.push(id);
  await query(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, params);

  return queryOne(
    'SELECT id, slug, name, description, icon, sort_order, is_active FROM categories WHERE id = ?',
    [id],
  );
}

/** Update a subcategory's editable fields. Same slug rule as above. */
export async function updateSubcategory(id, patch) {
  const sets = [];
  const params = [];

  if (patch.name !== undefined) {
    const name = str(patch.name, LIMITS.name);
    if (!name) throw new Error('A subcategory name cannot be empty.');
    sets.push('name = ?');
    params.push(name);
  }
  if (patch.description !== undefined) {
    sets.push('description = ?');
    params.push(str(patch.description, LIMITS.description) || null);
  }
  if (patch.sortOrder !== undefined) {
    sets.push('sort_order = ?');
    params.push(int(patch.sortOrder));
  }
  if (patch.isActive !== undefined) {
    sets.push('is_active = ?');
    params.push(bool(patch.isActive));
  }

  if (sets.length === 0) return null;

  params.push(id);
  await query(`UPDATE subcategories SET ${sets.join(', ')} WHERE id = ?`, params);

  return queryOne(
    `SELECT id, category_id, slug, name, description, sort_order, is_active
       FROM subcategories WHERE id = ?`,
    [id],
  );
}

/**
 * Apply a new ordering in one transaction.
 *
 * Reordering is inherently multi-row: the admin drags one item and several
 * positions shift. Writing them one statement at a time would leave the
 * navigation in a half-reordered state if the connection dropped midway, and
 * a concurrent reader could see two categories claiming position 3.
 */
export async function reorderCategories(entries) {
  const rows = (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && typeof entry.id === 'string')
    .slice(0, 200);

  if (rows.length === 0) return 0;

  await query('BEGIN');
  try {
    for (const [index, entry] of rows.entries()) {
      await query('UPDATE categories SET sort_order = ? WHERE id = ?', [
        int(entry.sortOrder ?? index + 1),
        entry.id,
      ]);
    }
    await query('COMMIT');
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }

  return rows.length;
}

/** Same, for subcategories within a category. */
export async function reorderSubcategories(entries) {
  const rows = (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && typeof entry.id === 'string')
    .slice(0, 200);

  if (rows.length === 0) return 0;

  await query('BEGIN');
  try {
    for (const [index, entry] of rows.entries()) {
      await query('UPDATE subcategories SET sort_order = ? WHERE id = ?', [
        int(entry.sortOrder ?? index + 1),
        entry.id,
      ]);
    }
    await query('COMMIT');
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }

  return rows.length;
}

export const CATEGORY_LIMITS = LIMITS;
export const CATEGORY_SLUG_RX = SLUG_RX;
