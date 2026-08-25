/**
 * Category registry API — mounted at /api/categories.
 *
 *   GET   /api/categories                       public; the whole tree
 *   GET   /api/categories/:slug                 public; one category
 *   GET   /api/categories/:slug/:subSlug        public; one subcategory
 *   GET   /api/categories/admin/tree            admin; includes inactive rows
 *   PATCH /api/categories/admin/:id             admin; edit a category
 *   PATCH /api/categories/admin/sub/:id         admin; edit a subcategory
 *   POST  /api/categories/admin/reorder         admin; reorder either level
 *
 * Why the reads are public
 * ------------------------
 * The category tree *is* the site navigation. Every visitor's first paint needs
 * it, and it contains nothing private — only what is already printed on the
 * page. The writes rewrite that navigation for everyone, so they carry the
 * same `requireAdmin` guard as /api/admin/*.
 *
 * Admin routes live under /api/categories/admin rather than in admin.routes.js
 * so that all category logic sits in one router. They are guarded
 * individually; the prefix grants nothing on its own.
 *
 * Availability: when the database is down the public reads answer 200 with the
 * seed file's structure instead of 503. Losing the CMS must degrade to "the
 * navigation shows default names", never to "the website is broken" — the same
 * contract the header/footer and widget CMSes already follow.
 */

import express from 'express';

import { isReady as dbReady } from '../db/index.js';
import { requireAdmin, requireDatabase } from '../middlewares/adminAuth.js';
import { recordAudit } from '../services/auth.service.js';
import {
  CATEGORY_ICONS,
  getCategoryBySlug,
  getCategoryTree,
  getSubcategoryBySlug,
  readSeed,
  reorderCategories,
  reorderSubcategories,
  updateCategory,
  updateSubcategory,
} from '../services/categories.service.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export const categoriesRouter = express.Router();

const ok = (req, res, data, extraMeta = {}) =>
  res.status(200).json({
    success: true,
    data,
    meta: { requestId: req.id, timestamp: new Date().toISOString(), ...extraMeta },
  });

/**
 * The seed rendered in the same shape as a database read.
 *
 * Ids are synthesised from slugs because the seed has none — the client uses
 * `id` only as a React key here, and the admin screens (the only place ids are
 * sent back) are unreachable while the database is down anyway.
 */
function seedAsTree() {
  const { categories } = readSeed();
  return categories.map((category) => ({
    id: `seed:${category.slug}`,
    slug: category.slug,
    name: category.name,
    description: category.description ?? '',
    icon: category.icon ?? 'grid',
    sortOrder: category.sortOrder ?? 0,
    isActive: true,
    toolCount: 0,
    subcategories: (category.subcategories ?? []).map((sub) => ({
      id: `seed:${category.slug}:${sub.slug}`,
      categoryId: `seed:${category.slug}`,
      slug: sub.slug,
      name: sub.name,
      description: sub.description ?? '',
      sortOrder: sub.sortOrder ?? 0,
      isActive: true,
      toolCount: 0,
    })),
  }));
}

/* ------------------------------------------------------------------ *
 * Public reads
 * ------------------------------------------------------------------ */

categoriesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!dbReady()) {
      return ok(req, res, { categories: seedAsTree() }, { source: 'seed' });
    }

    try {
      const categories = await getCategoryTree();
      // An empty table means the seed has not run yet (or was cleared). Serving
      // the file is better than serving a site with no navigation at all.
      if (categories.length === 0) {
        return ok(req, res, { categories: seedAsTree() }, { source: 'seed' });
      }
      return ok(req, res, { categories }, { source: 'database' });
    } catch (error) {
      logger.error('Category tree read failed — serving the seed', { error: error.message });
      return ok(req, res, { categories: seedAsTree() }, { source: 'seed' });
    }
  }),
);

/** Icon keys the admin picker offers. Static, so no database access. */
categoriesRouter.get('/icons', (req, res) => ok(req, res, { icons: CATEGORY_ICONS }));

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ *
 *
 * DECLARATION ORDER IS load-bearing. These literal '/admin/...' paths must be
 * registered BEFORE the '/:slug' and '/:slug/:subSlug' patterns below.
 * Express matches in declaration order, and '/admin/tree' is two segments, so
 * the public pair route happily captures it as category='admin',
 * subcategory='tree' and answers 404 SUBCATEGORY_NOT_FOUND -- the guarded
 * handler never runs. Moving these after the public routes silently breaks
 * the admin tree read; a regression test pins the behaviour.
 */

/** The full tree including deactivated rows, which the public read hides. */
categoriesRouter.get(
  '/admin/tree',
  requireDatabase,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const categories = await getCategoryTree({ includeInactive: true });
    ok(req, res, { categories });
  }),
);

categoriesRouter.patch(
  '/admin/sub/:id',
  requireDatabase,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};

    if (body.slug !== undefined) {
      // Explicit 400 rather than silently ignoring it: a client trying to
      // change a slug has a wrong mental model, and a quiet no-op would let
      // that misunderstanding persist.
      throw ApiError.badRequest(
        'SLUG_IMMUTABLE',
        'A subcategory slug is part of its public URL and cannot be changed.',
      );
    }

    const updated = await updateSubcategory(req.params.id, body);
    if (!updated) {
      throw ApiError.badRequest('NO_CHANGES', 'No editable fields were supplied.');
    }

    await recordAudit({
      username: req.admin.username,
      action: 'setting_changed',
      detail: `subcategory ${updated.slug} updated`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    ok(req, res, {
      subcategory: {
        id: updated.id,
        categoryId: updated.category_id,
        slug: updated.slug,
        name: updated.name,
        description: updated.description ?? '',
        sortOrder: updated.sort_order,
        isActive: updated.is_active,
      },
    });
  }),
);

categoriesRouter.patch(
  '/admin/:id',
  requireDatabase,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};

    if (body.slug !== undefined) {
      throw ApiError.badRequest(
        'SLUG_IMMUTABLE',
        'A category slug is part of its public URL and cannot be changed.',
      );
    }

    const updated = await updateCategory(req.params.id, body);
    if (!updated) {
      throw ApiError.badRequest('NO_CHANGES', 'No editable fields were supplied.');
    }

    await recordAudit({
      username: req.admin.username,
      action: 'setting_changed',
      detail: `category ${updated.slug} updated`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    ok(req, res, {
      category: {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        description: updated.description ?? '',
        icon: updated.icon ?? 'grid',
        sortOrder: updated.sort_order,
        isActive: updated.is_active,
      },
    });
  }),
);

/**
 * Reorder categories or subcategories.
 *
 * Body: `{ level: 'category' | 'subcategory', order: [{ id, sortOrder }] }`
 *
 * One endpoint for both levels because the operation is identical apart from
 * the table, and the admin UI drags them with the same component.
 */
categoriesRouter.post(
  '/admin/reorder',
  requireDatabase,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { level, order } = req.body ?? {};

    if (level !== 'category' && level !== 'subcategory') {
      throw ApiError.badRequest('INVALID_LEVEL', 'level must be "category" or "subcategory".');
    }
    if (!Array.isArray(order) || order.length === 0) {
      throw ApiError.badRequest('INVALID_ORDER', 'order must be a non-empty array.');
    }

    const updated =
      level === 'category' ? await reorderCategories(order) : await reorderSubcategories(order);

    await recordAudit({
      username: req.admin.username,
      action: 'setting_changed',
      detail: `${level} order updated (${updated} rows)`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    ok(req, res, { level, updated });
  }),
);

/* ------------------------------------------------------------------ *
 * Public: single category / subcategory
 * ------------------------------------------------------------------ *
 *
 * Declared last: these wildcard patterns swallow any path shape they match,
 * so every literal route must already be registered above.
 */

categoriesRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    if (!dbReady()) {
      const category = seedAsTree().find((c) => c.slug === req.params.slug);
      if (!category) {
        throw new ApiError(404, 'CATEGORY_NOT_FOUND', `No category "${req.params.slug}".`);
      }
      return ok(req, res, { category }, { source: 'seed' });
    }

    const category = await getCategoryBySlug(req.params.slug);
    if (!category) {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', `No category "${req.params.slug}".`);
    }
    ok(req, res, { category });
  }),
);

categoriesRouter.get(
  '/:slug/:subSlug',
  asyncHandler(async (req, res) => {
    const { slug, subSlug } = req.params;

    if (!dbReady()) {
      const category = seedAsTree().find((c) => c.slug === slug);
      const subcategory = category?.subcategories.find((s) => s.slug === subSlug);
      if (!category || !subcategory) {
        throw new ApiError(404, 'SUBCATEGORY_NOT_FOUND', `No "${slug}/${subSlug}".`);
      }
      return ok(req, res, { category, subcategory }, { source: 'seed' });
    }

    // Resolved through the parent: subcategory slugs are only unique per
    // category, so a mismatched pairing must 404 rather than resolve.
    const row = await getSubcategoryBySlug(slug, subSlug);
    if (!row) {
      throw new ApiError(404, 'SUBCATEGORY_NOT_FOUND', `No "${slug}/${subSlug}".`);
    }

    const category = await getCategoryBySlug(slug);

    ok(req, res, {
      category,
      subcategory: {
        id: row.id,
        categoryId: row.category_id,
        slug: row.slug,
        name: row.name,
        description: row.description ?? '',
        sortOrder: row.sort_order,
        isActive: row.is_active,
        categorySlug: row.category_slug,
        categoryName: row.category_name,
      },
    });
  }),
);
