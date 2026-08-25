/**
 * Header/footer CMS API — mounted at /api/layout.
 *
 *   GET  /api/layout/header-footer   -> public; the website renders this
 *   POST /api/layout/header-footer   -> admin only; saves the document
 *
 * POST merges per section: send only `header` and the stored `footer` is
 * preserved. Fields inside a section you do send are replaced wholesale, so
 * the editor always submits a complete section.
 *
 * Why the two verbs have different protection
 * -------------------------------------------
 * GET must be public: every visitor's first paint depends on it, and it
 * contains nothing private — only what is already visible on the page.
 *
 * POST must NOT be public, even though it shares the `/api/layout` prefix.
 * It rewrites the header and footer of every page on the site. Left open it
 * would be a defacement endpoint, and an attacker could inject links site-wide.
 * So it carries the same `requireAdmin` guard as /api/admin/*.
 *
 * Availability: when the database is down, GET still answers 200 with the
 * built-in defaults rather than 503. A CMS outage must degrade to "shows the
 * default header" and never to "the website is broken".
 */

import express from 'express';

import { isReady as dbReady } from '../db/index.js';
import { requireAdmin, requireDatabase } from '../middlewares/adminAuth.js';
import { recordAudit } from '../services/auth.service.js';
import {
  DEFAULT_LAYOUT,
  getLayout,
  sanitiseLayout,
  saveLayout,
} from '../services/layout.service.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export const layoutRouter = express.Router();

/** Uniform success envelope, matching the rest of the API. */
const ok = (req, res, data, extraMeta = {}) =>
  res.status(200).json({
    success: true,
    data,
    meta: { requestId: req.id, timestamp: new Date().toISOString(), ...extraMeta },
  });

/* ------------------------------------------------------------------ *
 * Public read
 * ------------------------------------------------------------------ */

layoutRouter.get(
  '/header-footer',
  asyncHandler(async (req, res) => {
    if (!dbReady()) {
      // Degrade to defaults rather than failing the page.
      return ok(
        req,
        res,
        { value: sanitiseLayout(DEFAULT_LAYOUT), updatedAt: null, updatedBy: null },
        { source: 'defaults' },
      );
    }

    try {
      const stored = await getLayout();
      return ok(req, res, stored, { source: 'database' });
    } catch (error) {
      // Same reasoning: a read failure should not take the site down.
      logger.error('Layout read failed — serving defaults', { error: error.message });
      return ok(
        req,
        res,
        { value: sanitiseLayout(DEFAULT_LAYOUT), updatedAt: null, updatedBy: null },
        { source: 'defaults' },
      );
    }
  }),
);

/* ------------------------------------------------------------------ *
 * Admin write
 * ------------------------------------------------------------------ */

layoutRouter.post(
  '/header-footer',
  requireDatabase,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw ApiError.badRequest(
        'INVALID_LAYOUT',
        'Expected a JSON object with "header" and "footer" keys.',
      );
    }
    if (!body.header && !body.footer) {
      throw ApiError.badRequest(
        'INVALID_LAYOUT',
        'The document must contain at least a "header" or a "footer" section.',
      );
    }

    // Merge onto what is stored, section by section.
    //
    // sanitiseLayout() fills any missing section from DEFAULT_LAYOUT, so a
    // body carrying only `header` used to reset the whole footer to defaults
    // and silently destroy the saved navigation, columns and social links.
    // A caller that sends one section means "change this section", never
    // "erase the other one".
    let base = DEFAULT_LAYOUT;
    try {
      ({ value: base } = await getLayout());
    } catch {
      // No stored document yet — defaults are the right base.
    }

    const merged = {
      header: body.header ? { ...base.header, ...body.header } : base.header,
      footer: body.footer ? { ...base.footer, ...body.footer } : base.footer,
    };

    const value = await saveLayout(merged, req.admin.username);

    await recordAudit({
      username: req.admin.username,
      action: 'setting_changed',
      detail: `layout_header_footer -> ${value.header.navLinks.length} nav, ${value.footer.columns.length} columns, ${value.footer.socialLinks.length} social`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    ok(req, res, { value, updatedBy: req.admin.username });
  }),
);
