/**
 * Tools Registry Service — seeds and serves the catalog of Phase 1 tools:
 *   1. Document & Spreadsheet Tools Module
 *   2. PDF Editing & Management Module
 *   3. Image Tools & Extended Converters Module
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { query, queryOne } from '../db/index.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, '..', 'config', 'toolsRegistry.json');

/** Reads the static tools registry manifest. */
export function readToolsRegistry() {
  try {
    const content = fs.readFileSync(SEED_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logger.error('Failed to read tools registry JSON', { error: error.message });
    return { version: 1, modules: [], tools: [] };
  }
}

/**
 * Returns all tools with optional filtering.
 */
export async function getTools({ module, categorySlug, subcategorySlug, search, featured } = {}) {
  const { tools, modules } = readToolsRegistry();

  let filtered = [...tools];

  if (module) {
    filtered = filtered.filter((t) => t.module === module);
  }

  if (categorySlug) {
    filtered = filtered.filter((t) => t.categorySlug === categorySlug);
  }

  if (subcategorySlug) {
    filtered = filtered.filter((t) => t.subcategorySlug === subcategorySlug);
  }

  if (featured !== undefined) {
    filtered = filtered.filter((t) => (t.isFeatured ?? false) === Boolean(featured));
  }

  if (search && typeof search === 'string') {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.tagline && t.tagline.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q))),
    );
  }

  return {
    modules,
    total: filtered.length,
    tools: filtered,
  };
}

/**
 * Resolves a tool by slug.
 */
export async function getToolBySlug(slug) {
  if (!slug || typeof slug !== 'string') return null;
  const { tools, modules } = readToolsRegistry();
  const cleanSlug = slug.trim().toLowerCase();

  const tool = tools.find((t) => t.slug === cleanSlug);
  if (!tool) return null;

  const moduleInfo = modules.find((m) => m.id === tool.module) ?? null;

  // Try fetching dynamic usage count from DB if ready
  let usageCount = 0;
  try {
    const dbRow = await queryOne('SELECT usage_count FROM tools WHERE slug = ?', [tool.slug]);
    if (dbRow) usageCount = Number(dbRow.usage_count ?? 0);
  } catch {
    // Tolerates database cold-start
  }

  return {
    ...tool,
    moduleInfo,
    usageCount,
  };
}

/**
 * Increments the usage counter for a tool.
 */
export async function incrementToolUsage(slug) {
  try {
    await query(`UPDATE tools SET usage_count = usage_count + 1 WHERE slug = ?`, [slug]);
  } catch (error) {
    logger.debug('Failed to increment tool usage count', { slug, error: error.message });
  }
}

/**
 * Seeds all Phase 1 tools into the PostgreSQL `tools` table.
 *
 * Additive and non-destructive: registers tools, sets status='published'
 * with published_at timestamp, and links to category/subcategory UUIDs.
 */
export async function syncToolsSeed() {
  const { tools } = readToolsRegistry();
  let inserted = 0;
  let updated = 0;

  for (const tool of tools) {
    try {
      const catRow = await queryOne('SELECT id FROM categories WHERE slug = ?', [
        tool.categorySlug,
      ]);
      if (!catRow) continue;

      let subId = null;
      if (tool.subcategorySlug) {
        const subRow = await queryOne(
          'SELECT id FROM subcategories WHERE category_id = ? AND slug = ?',
          [catRow.id, tool.subcategorySlug],
        );
        if (subRow) subId = subRow.id;
      }

      const route = `/tools/${tool.module}/${tool.slug}`;

      const existing = await queryOne('SELECT id FROM tools WHERE slug = ?', [tool.slug]);

      if (!existing) {
        await query(
          `INSERT INTO tools (
            category_id, subcategory_id, slug, name, tagline, description,
            route, icon, tags, status, is_featured, is_premium,
            metadata, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?::jsonb, NOW())`,
          [
            catRow.id,
            subId,
            tool.slug,
            tool.name,
            tool.tagline ?? '',
            tool.description ?? '',
            route,
            tool.icon ?? 'wrench',
            tool.tags ?? [],
            Boolean(tool.isFeatured),
            Boolean(tool.isPremium),
            JSON.stringify({
              inputFormats: tool.inputFormats ?? [],
              outputFormats: tool.outputFormats ?? [],
              defaultOutput: tool.defaultOutput ?? '',
              options: tool.options ?? [],
              module: tool.module,
            }),
          ],
        );
        inserted += 1;
      } else {
        await query(
          `UPDATE tools SET
            category_id = ?, subcategory_id = ?, name = ?, tagline = ?, description = ?,
            route = ?, icon = ?, tags = ?, is_featured = ?, metadata = ?::jsonb,
            status = 'published', published_at = COALESCE(published_at, NOW())
           WHERE slug = ?`,
          [
            catRow.id,
            subId,
            tool.name,
            tool.tagline ?? '',
            tool.description ?? '',
            route,
            tool.icon ?? 'wrench',
            tool.tags ?? [],
            Boolean(tool.isFeatured),
            JSON.stringify({
              inputFormats: tool.inputFormats ?? [],
              outputFormats: tool.outputFormats ?? [],
              defaultOutput: tool.defaultOutput ?? '',
              options: tool.options ?? [],
              module: tool.module,
            }),
            tool.slug,
          ],
        );
        updated += 1;
      }
    } catch (err) {
      logger.error('Failed to sync tool row', { slug: tool.slug, error: err.message });
    }
  }

  logger.info('Tools registry synchronized with database', {
    inserted,
    updated,
    total: tools.length,
  });
  return { inserted, updated, total: tools.length };
}
