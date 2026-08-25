/**
 * Sidebar widget engine API — mounted at /api/widgets.
 *
 *   GET  /api/widgets/config   -> public; the website renders this
 *   POST /api/widgets/config   -> admin only; saves the placement document
 *   GET  /api/widgets/catalogue -> public; the type registry + settings schema
 *   GET  /api/widgets/public-stats -> public; live numbers the widgets display
 *
 * Why the verbs differ in protection
 * ----------------------------------
 * GET must be public: every visitor's first paint depends on it, and it holds
 * nothing private — only what is already visible on the page.
 *
 * POST must not be. It rewrites the sidebars of every page on the site, and
 * the Custom HTML widget can carry markup. Left open it would be a defacement
 * and injection endpoint, so it carries the same `requireAdmin` guard as
 * /api/admin/*.
 *
 * `public-stats` deserves its own note. The Live Online Users and System Stats
 * widgets render on the *public* site, so they cannot call /api/admin — that
 * needs a staff token. Rather than loosening the admin route, this endpoint
 * exposes a deliberately narrow projection: aggregate counts only. No session
 * ids, no IP addresses, no user agents, no geography — none of the per-visitor
 * detail the admin view carries. Publishing "how many people are here" is a
 * product decision; publishing who they are is not.
 *
 * Availability: when the database is down, GET still answers 200 with the
 * built-in defaults rather than 503. A CMS outage must degrade to "shows the
 * default sidebar" and never to "the website is broken".
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

import { env } from '../config/env.js';
import { isReady as dbReady, queryOne } from '../db/index.js';
import { requireAdmin, requireDatabase } from '../middlewares/adminAuth.js';
import { recordAudit } from '../services/auth.service.js';
import {
  DEFAULT_WIDGET_CONFIG,
  WIDGET_CATALOGUE,
  ZONES,
  getWidgetConfig,
  saveWidgetConfig,
} from '../services/widgets.service.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export const widgetsRouter = express.Router();

/** Uniform success envelope, matching the rest of the API. */
const ok = (req, res, data, extraMeta = {}) =>
  res.status(200).json({
    success: true,
    data,
    meta: { requestId: req.id, timestamp: new Date().toISOString(), ...extraMeta },
  });

/** Read once at import: the version is static for the life of the process. */
const APP_VERSION = (() => {
  try {
    const manifest = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    return JSON.parse(fs.readFileSync(manifest, 'utf8')).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
})();

const SERVER_STARTED_AT = Date.now();

/* ------------------------------------------------------------------ *
 * Catalogue — what the warehouse offers
 * ------------------------------------------------------------------ */

/**
 * Public because the admin page and the renderer both need it, and it is pure
 * static metadata: type names, descriptions and field schemas. Serving it from
 * the server rather than duplicating it in the client is what keeps the two
 * from drifting — the admin form is generated from exactly the schema the
 * validator enforces.
 */
widgetsRouter.get('/catalogue', (req, res) =>
  ok(req, res, {
    zones: ZONES,
    widgets: Object.values(WIDGET_CATALOGUE),
  }),
);

/* ------------------------------------------------------------------ *
 * Public read
 * ------------------------------------------------------------------ */

widgetsRouter.get(
  '/config',
  asyncHandler(async (req, res) => {
    if (!dbReady()) {
      // Degrade to defaults rather than failing the page.
      return ok(
        req,
        res,
        { value: DEFAULT_WIDGET_CONFIG, updatedAt: null, updatedBy: null },
        { source: 'defaults' },
      );
    }

    try {
      const stored = await getWidgetConfig();
      return ok(req, res, stored, { source: 'database' });
    } catch (error) {
      logger.error('Widget config read failed — serving defaults', { error: error.message });
      return ok(
        req,
        res,
        { value: DEFAULT_WIDGET_CONFIG, updatedAt: null, updatedBy: null },
        { source: 'defaults' },
      );
    }
  }),
);

/* ------------------------------------------------------------------ *
 * Admin write
 * ------------------------------------------------------------------ */

widgetsRouter.post(
  '/config',
  requireDatabase,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw ApiError.badRequest(
        'INVALID_WIDGET_CONFIG',
        'Expected a JSON object with a "zones" key.',
      );
    }
    if (!body.zones || typeof body.zones !== 'object' || Array.isArray(body.zones)) {
      throw ApiError.badRequest(
        'INVALID_WIDGET_CONFIG',
        'The document must contain a "zones" object keyed by zone name.',
      );
    }

    // Unlike the header/footer CMS this replaces the document wholesale rather
    // than merging. A widget layout is inherently a complete arrangement: the
    // editor always holds both zones in memory, and "merge" has no sensible
    // meaning for a reorder or a delete — a removed widget would come back.
    const value = await saveWidgetConfig(body, req.admin.username);

    const counts = ZONES.map((z) => `${z}:${value.zones[z].length}`).join(' ');
    await recordAudit({
      username: req.admin.username,
      action: 'setting_changed',
      detail: `layout_sidebar_widgets -> ${counts}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    ok(req, res, { value, updatedBy: req.admin.username });
  }),
);

/* ------------------------------------------------------------------ *
 * Public stats for the live widgets
 * ------------------------------------------------------------------ */

/**
 * Aggregate-only numbers for the Online Users and System Stats widgets.
 *
 * Everything here is a COUNT. The per-session rows behind these numbers stay
 * behind /api/admin. Degrades to nulls when the database is down so the
 * widgets can show "—" instead of disappearing.
 */
widgetsRouter.get(
  '/public-stats',
  asyncHandler(async (req, res) => {
    const uptimeSeconds = Number(((Date.now() - SERVER_STARTED_AT) / 1000).toFixed(0));

    const base = {
      model: env.HF_MODEL,
      version: APP_VERSION,
      uptimeSeconds,
      online: null,
      totals: null,
    };

    if (!dbReady()) {
      return ok(req, res, base, { source: 'runtime' });
    }

    try {
      const windowSeconds = env.ADMIN_ONLINE_WINDOW_SECONDS;

      const online = await queryOne(
        `SELECT
           COUNT(*)                                        AS total,
           COUNT(*) FILTER (WHERE device_type = 'mobile')  AS mobile,
           COUNT(*) FILTER (WHERE device_type = 'desktop') AS desktop,
           COUNT(*) FILTER (WHERE device_type = 'tablet')  AS tablet,
           COUNT(DISTINCT country_code)                    AS countries
         FROM visitor_sessions
         WHERE last_seen_at >= NOW() - (? * INTERVAL '1 second')`,
        [windowSeconds],
      );

      const totals = await queryOne(
        `SELECT
           COUNT(*)                                       AS conversions,
           COUNT(*) FILTER (WHERE status = 'success')     AS successful,
           COALESCE(SUM(characters), 0)                   AS characters
         FROM conversion_logs`,
      );

      return ok(
        req,
        res,
        {
          ...base,
          online: {
            total: Number(online?.total ?? 0),
            mobile: Number(online?.mobile ?? 0),
            desktop: Number(online?.desktop ?? 0),
            tablet: Number(online?.tablet ?? 0),
            countries: Number(online?.countries ?? 0),
            windowSeconds,
          },
          totals: {
            conversions: Number(totals?.conversions ?? 0),
            successful: Number(totals?.successful ?? 0),
            characters: Number(totals?.characters ?? 0),
          },
        },
        { source: 'database' },
      );
    } catch (error) {
      // A stats failure must not break the page the widget sits on.
      logger.warn('Public stats read failed', { error: error.message });
      return ok(req, res, base, { source: 'runtime' });
    }
  }),
);
