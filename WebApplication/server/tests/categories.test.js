/**
 * Tests for the category & sub-category registry.
 *
 * What matters here, in priority order:
 *
 *   1. The public reads never fail. This registry is the navigation for the
 *      whole site — if it 500s when the database is down, every page loses its
 *      menu. The seed fallback must answer 200 with the full tree.
 *   2. Slugs are immutable. They are in the public URLs the whole feature
 *      exists to produce, so a PATCH carrying `slug` must be refused rather
 *      than quietly ignored — silent ignoring would let an admin believe a
 *      rename happened.
 *   3. Sub-category lookups are scoped to their parent. Sub-slugs are unique
 *      only per category, so a valid sub-slug under the *wrong* parent must
 *      404 instead of resolving.
 *   4. The admin surface is not public. It shares the /api/categories prefix
 *      with the open reads, which is exactly the shape that leads to an
 *      accidentally world-writable endpoint.
 *
 * Under NODE_ENV=test the database is disabled, so the public routes exercise
 * the seed path and the admin routes stop at requireDatabase/requireAdmin.
 * Service-level logic that needs SQL is verified separately against the live
 * database rather than mocked here.
 */

import request from 'supertest';
import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../index.js');
const { CATEGORY_ICONS, CATEGORY_SLUG_RX, readSeed } =
  await import('../services/categories.service.js');

const seed = readSeed();

/* ------------------------------------------------------------------ *
 * Seed integrity
 * ------------------------------------------------------------------ */

describe('category seed', () => {
  it('defines 8 categories and 25 sub-categories', () => {
    const subCount = seed.categories.reduce((sum, c) => sum + c.subcategories.length, 0);

    expect(seed.categories).toHaveLength(8);
    expect(subCount).toBe(25);
  });

  it('uses valid, unique category slugs', () => {
    const slugs = seed.categories.map((c) => c.slug);

    for (const slug of slugs) expect(slug).toMatch(CATEGORY_SLUG_RX);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('uses valid sub-category slugs that are unique within their parent', () => {
    for (const category of seed.categories) {
      const slugs = category.subcategories.map((s) => s.slug);

      for (const slug of slugs) expect(slug).toMatch(CATEGORY_SLUG_RX);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it('only references icons from the allowlist', () => {
    for (const category of seed.categories) {
      expect(CATEGORY_ICONS).toContain(category.icon);
    }
  });

  it('produces the URL shape the specification calls for', () => {
    // The worked example from the brief, asserted end to end.
    const category = seed.categories.find((c) => c.slug === 'pdf-document-tools');
    expect(category).toBeDefined();

    const sub = category.subcategories.find((s) => s.slug === 'pdf-converters');
    expect(sub).toBeDefined();

    expect(`/tools/${category.slug}/${sub.slug}/pdf-to-word`).toBe(
      '/tools/pdf-document-tools/pdf-converters/pdf-to-word',
    );
  });
});

/* ------------------------------------------------------------------ *
 * Public reads
 * ------------------------------------------------------------------ */

describe('GET /api/categories', () => {
  it('is public and answers 200 without a token', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('serves the full tree from seed when the database is unavailable', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.body.meta.source).toBe('seed');
    expect(res.body.data.categories).toHaveLength(8);

    const subCount = res.body.data.categories.reduce((sum, c) => sum + c.subcategories.length, 0);
    expect(subCount).toBe(25);
  });

  it('returns categories in sortOrder', async () => {
    const res = await request(app).get('/api/categories');
    const orders = res.body.data.categories.map((c) => c.sortOrder);

    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('reports zero tools everywhere — no tools are registered yet', async () => {
    const res = await request(app).get('/api/categories');

    for (const category of res.body.data.categories) {
      expect(category.toolCount).toBe(0);
      for (const sub of category.subcategories) expect(sub.toolCount).toBe(0);
    }
  });
});

describe('GET /api/categories/icons', () => {
  it('exposes the icon allowlist so the admin picker cannot drift', async () => {
    const res = await request(app).get('/api/categories/icons');

    expect(res.status).toBe(200);
    expect(res.body.data.icons).toEqual(CATEGORY_ICONS);
  });
});

describe('GET /api/categories/:slug', () => {
  it('resolves a known category', async () => {
    const res = await request(app).get('/api/categories/pdf-document-tools');

    expect(res.status).toBe(200);
    expect(res.body.data.category.slug).toBe('pdf-document-tools');
    expect(res.body.data.category.subcategories).toHaveLength(3);
  });

  it('404s an unknown category', async () => {
    const res = await request(app).get('/api/categories/no-such-category');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
  });
});

describe('GET /api/categories/:slug/:subSlug', () => {
  it('resolves a sub-category under its own parent', async () => {
    const res = await request(app).get('/api/categories/pdf-document-tools/pdf-converters');

    expect(res.status).toBe(200);
    // The parent is returned alongside the child, not nested inside it, so a
    // page can render breadcrumbs from one request.
    expect(res.body.data.subcategory.slug).toBe('pdf-converters');
    expect(res.body.data.category.slug).toBe('pdf-document-tools');
  });

  it('404s a sub-category requested under the wrong parent', async () => {
    // 'pdf-converters' is real, but not a child of image-graphics-tools.
    const res = await request(app).get('/api/categories/image-graphics-tools/pdf-converters');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SUBCATEGORY_NOT_FOUND');
  });
});

/* ------------------------------------------------------------------ *
 * Admin surface
 * ------------------------------------------------------------------ */

describe('admin category routes', () => {
  it('refuses an unauthenticated tree read', async () => {
    const res = await request(app).get('/api/categories/admin/tree');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('refuses an unauthenticated category patch', async () => {
    const res = await request(app)
      .patch('/api/categories/admin/00000000-0000-0000-0000-000000000000')
      .send({ name: 'Hijacked' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('refuses an unauthenticated reorder', async () => {
    const res = await request(app)
      .post('/api/categories/admin/reorder')
      .send({ level: 'category', order: [] });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  /*
   * Regression: '/admin/tree' is two path segments, so the public
   * '/:slug/:subSlug' route will capture it as category='admin',
   * subcategory='tree' if it is declared first — the guarded handler never
   * runs and the endpoint answers a misleading 404 instead of 401.
   *
   * This shipped broken once and the original assertion (checking only that
   * the code was not CATEGORY_NOT_FOUND) passed straight through it, because
   * the wrong handler returned SUBCATEGORY_NOT_FOUND. Assert the status the
   * guard produces, not the absence of one particular error code.
   */
  it('routes /admin/tree to the guard, not the public :slug/:subSlug handler', async () => {
    const res = await request(app).get('/api/categories/admin/tree');

    expect(res.body?.error?.code).not.toBe('SUBCATEGORY_NOT_FOUND');
    expect(res.body?.error?.code).not.toBe('CATEGORY_NOT_FOUND');
    // 401 unauthenticated, or 503 when the database guard fires first.
    expect([401, 503]).toContain(res.status);
  });

  it('applies the same guard to every admin verb', async () => {
    const responses = await Promise.all([
      request(app).get('/api/categories/admin/tree'),
      request(app)
        .patch('/api/categories/admin/00000000-0000-0000-0000-000000000000')
        .send({ name: 'x' }),
      request(app)
        .patch('/api/categories/admin/sub/00000000-0000-0000-0000-000000000000')
        .send({ name: 'x' }),
      request(app).post('/api/categories/admin/reorder').send({ level: 'category', order: [] }),
    ]);

    for (const res of responses) {
      expect([401, 503]).toContain(res.status);
    }
  });
});
