/**
 * Category registry types.
 *
 * Shared by the public explorer (which browses the tree), the admin CMS (which
 * edits it) and the API client, so the three cannot drift apart silently.
 *
 * Mirrors `server/services/categories.service.js`. The server shapes rows into
 * camelCase before they leave, so nothing here deals in snake_case.
 */

export type Subcategory = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  /** Published tools in this subcategory. */
  toolCount: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Key into the client icon map; unknown keys fall back to a generic glyph. */
  icon: string;
  sortOrder: number;
  isActive: boolean;
  toolCount: number;
  subcategories: Subcategory[];
};

export type CategoryTreeResponse = {
  categories: Category[];
};

/** A subcategory resolved through its parent, as the nested route returns it. */
export type SubcategoryDetail = Subcategory & {
  categorySlug: string;
  categoryName: string;
};

/* ---------------- URL helpers ---------------- */

/**
 * The canonical URL builders.
 *
 * Centralised so the SEO-facing URL shape is defined exactly once. Hand-writing
 * `/tools/${a}/${b}` at each call site is how a stray trailing slash or a
 * double slash ends up in production and splits a page's search ranking across
 * two addresses.
 */
export const toolsRoot = () => '/tools';
export const categoryPath = (categorySlug: string) => `/tools/${categorySlug}`;
export const subcategoryPath = (categorySlug: string, subcategorySlug: string) =>
  `/tools/${categorySlug}/${subcategorySlug}`;
export const toolPath = (categorySlug: string, subcategorySlug: string, toolSlug: string) =>
  `/tools/${categorySlug}/${subcategorySlug}/${toolSlug}`;

/* ---------------- Admin ---------------- */

/** Fields an admin may change. `slug` is absent deliberately — it is in the URL. */
export type CategoryPatch = {
  name?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type SubcategoryPatch = Omit<CategoryPatch, 'icon'>;

export type ReorderEntry = { id: string; sortOrder: number };
