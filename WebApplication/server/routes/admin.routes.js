/**
 * Admin dashboard API — mounted at /api/admin.
 *
 * Route map (mirrors the React routes one-to-one)
 *   POST   /auth/login                  -> issue tokens
 *   POST   /auth/refresh                -> rotate the access token
 *   POST   /auth/logout                 -> audit the sign-out
 *   GET    /auth/me                     -> current admin
 *   POST   /security/password           -> change own password
 *   GET    /security/admin-access       -> auth posture + recent audit log
 *   GET    /userinfo/online-now         -> live sessions
 *   GET    /userinfo/online-now/:id     -> one session (modal inspector)
 *   GET    /userinfo/time-range-stats   -> aggregates for a period
 *   GET    /logs/conversions            -> transcription history (paged)
 *   GET    /logs/system-errors          -> error events (paged)
 *   PATCH  /logs/system-errors/:id      -> mark resolved
 *   GET    /settings/limits             -> upload limit config
 *   PUT    /settings/limits             -> update it
 *   GET    /settings/notice             -> global notice banner
 *   PUT    /settings/notice             -> update it
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

import { MIN_ADMIN_PASSWORD_LENGTH, env } from '../config/env.js';
import { query, queryOne, readJson } from '../db/index.js';
import { requireAdmin, requireDatabase, requireRole } from '../middlewares/adminAuth.js';
import {
  changePassword,
  issueTokens,
  recordAudit,
  verifyCredentials,
  verifyToken,
} from '../services/auth.service.js';
import { syncToolsSeed } from '../services/toolsRegistry.service.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

export const adminRouter = express.Router();

/** Uniform success envelope, matching the public API. */
const ok = (req, res, data, extraMeta = {}) =>
  res.status(200).json({
    success: true,
    data,
    meta: { requestId: req.id, timestamp: new Date().toISOString(), ...extraMeta },
  });

/* ---------------- Setup Super Admin ---------------- */

adminRouter.post(
  '/setup-super-admin',
  requireDatabase,
  asyncHandler(async (req, res) => {
    const username = String(req.body?.username ?? 'admin')
      .trim()
      .toLowerCase();
    const email = String(req.body?.email ?? 'admin@inwebtools.com')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? '');
    const fullName = String(req.body?.fullName ?? 'Master Super Administrator').trim();
    const setupSecret = String(req.body?.setupSecret ?? '').trim();

    if (!password || password.length < MIN_ADMIN_PASSWORD_LENGTH) {
      throw ApiError.badRequest(
        'WEAK_PASSWORD',
        `Password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`,
      );
    }

    // Security check: if a super_admin already exists, verify setupSecret or JWT
    const existingSuperAdmin = await queryOne(
      "SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE LIMIT 1",
    );

    if (existingSuperAdmin) {
      const validSecret =
        process.env.ADMIN_SETUP_SECRET ||
        process.env.JWT_SECRET ||
        'inwebtools_master_setup_secret';
      if (setupSecret !== validSecret) {
        throw new ApiError(
          403,
          'FORBIDDEN',
          'A Super Admin account already exists. Provide a valid setupSecret to proceed.',
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const existingUser = await queryOne(
      'SELECT id, username, email FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
      [username, email],
    );

    let user;
    if (existingUser) {
      user = await queryOne(
        `UPDATE users
         SET username = ?, email = ?, password_hash = ?, full_name = ?, role = 'super_admin', is_active = TRUE, updated_at = NOW()
         WHERE id = ?
         RETURNING id, username, email, full_name, role, is_active`,
        [username, email, passwordHash, fullName, existingUser.id],
      );
    } else {
      user = await queryOne(
        `INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'super_admin', TRUE, NOW(), NOW())
         RETURNING id, username, email, full_name, role, is_active`,
        [username, email, passwordHash, fullName],
      );
    }

    await recordAudit({
      username: user.username,
      action: 'super_admin_setup',
      detail: `Super admin initialized for ${user.username}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const tokens = issueTokens(user);
    ok(req, res, { user, ...tokens, message: 'Super Admin initialized successfully.' });
  }),
);

/* ---------------- Auth ---------------- */

// Brute-force protection on the login endpoint specifically.
//
// skipSuccessfulRequests matters: the point is to slow down guessing, and
// counting successes too locked out anyone who signed in five times in a
// quarter of an hour — normal behaviour while developing.
const loginLimiter = rateLimit({
  windowMs: env.ADMIN_LOGIN_WINDOW_MS,
  max: env.ADMIN_LOGIN_MAX_ATTEMPTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.IS_TEST,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed sign-in attempts. Try again later.',
      },
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  },
});

adminRouter.post(
  '/auth/login',
  loginLimiter,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!username || !password) {
      throw ApiError.badRequest('MISSING_CREDENTIALS', 'Username and password are required.');
    }

    const user = await verifyCredentials(username, password);

    if (!user) {
      await recordAudit({
        username,
        action: 'login_failed',
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      // One generic message: never reveal whether the username exists.
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect username or password.');
    }

    const tokens = issueTokens(user);
    await recordAudit({
      username: user.username,
      action: 'login_success',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    ok(req, res, { user, ...tokens });
  }),
);

adminRouter.post(
  '/auth/refresh',
  requireDatabase,
  asyncHandler(async (req, res) => {
    const token = String(req.body?.refreshToken ?? '');
    if (!token) throw ApiError.badRequest('MISSING_TOKEN', 'A refresh token is required.');

    const payload = verifyToken(token, 'refresh');
    const user = await queryOne(
      'SELECT id, username, role FROM users WHERE id = ? AND is_active = TRUE LIMIT 1',
      [Number(payload.sub)],
    );
    if (!user) throw new ApiError(401, 'AUTH_REQUIRED', 'This account is no longer active.');

    ok(req, res, { user, ...issueTokens(user) });
  }),
);

adminRouter.post(
  '/auth/logout',
  requireDatabase,
  requireAdmin,
  asyncHandler(async (req, res) => {
    await recordAudit({
      username: req.admin.username,
      action: 'logout',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    ok(req, res, { loggedOut: true });
  }),
);

adminRouter.get('/auth/me', requireDatabase, requireAdmin, (req, res) =>
  ok(req, res, { user: req.admin }),
);

/* ------------------------------------------------------------------ *
 * Everything below requires a valid admin token
 * ------------------------------------------------------------------ */

adminRouter.use(requireDatabase, requireAdmin);

/* ---------------- Userinfo / UserOnlineNow ---------------- */

adminRouter.get(
  '/userinfo/online-now',
  asyncHandler(async (req, res) => {
    const windowSeconds = env.ADMIN_ONLINE_WINDOW_SECONDS;

    const sessions = await query(
      `SELECT session_id, ip_address, device_type, browser, os,
              country, country_code, city, isp, geo_status,
              page_views, first_seen_at, last_seen_at,
              CAST(EXTRACT(EPOCH FROM (NOW() - last_seen_at)) AS INTEGER)
                AS seconds_since_seen,
              CAST(EXTRACT(EPOCH FROM (last_seen_at - first_seen_at)) AS INTEGER)
                AS session_seconds
         FROM visitor_sessions
        WHERE last_seen_at >= NOW() - (? * INTERVAL '1 second')
        ORDER BY last_seen_at DESC
        LIMIT 200`,
      [windowSeconds],
    );

    const summary = await queryOne(
      `SELECT
         COUNT(*) AS online_total,
         COUNT(*) FILTER (WHERE device_type = 'mobile')  AS mobile,
         COUNT(*) FILTER (WHERE device_type = 'desktop') AS desktop,
         COUNT(*) FILTER (WHERE device_type = 'tablet')  AS tablet,
         COUNT(DISTINCT country_code) AS countries
       FROM visitor_sessions
       WHERE last_seen_at >= NOW() - (? * INTERVAL '1 second')`,
      [windowSeconds],
    );

    ok(req, res, {
      windowSeconds,
      summary: {
        onlineTotal: Number(summary?.online_total ?? 0),
        mobile: Number(summary?.mobile ?? 0),
        desktop: Number(summary?.desktop ?? 0),
        tablet: Number(summary?.tablet ?? 0),
        countries: Number(summary?.countries ?? 0),
      },
      sessions,
      geoLookupEnabled: env.GEO_LOOKUP_ENABLED,
    });
  }),
);

adminRouter.get(
  '/userinfo/online-now/:sessionId',
  asyncHandler(async (req, res) => {
    const session = await queryOne(
      `SELECT session_id, ip_address, user_agent, device_type, browser, os,
              country, country_code, city, isp, geo_status,
              page_views, first_seen_at, last_seen_at,
              CAST(EXTRACT(EPOCH FROM (last_seen_at - first_seen_at)) AS INTEGER)
                AS session_seconds
         FROM visitor_sessions WHERE session_id = ? LIMIT 1`,
      [req.params.sessionId],
    );

    if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'That session no longer exists.');

    // What this visitor actually did, for the modal inspector.
    const conversions = await query(
      `SELECT request_id, file_name, file_size_bytes, language, status,
              error_code, characters, duration_ms, created_at
         FROM conversion_logs
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT 20`,
      [req.params.sessionId],
    );

    ok(req, res, { session, conversions });
  }),
);

/* ---------------- Userinfo / TimeRangeStats ---------------- */

/**
 * Whitelisted ranges -> SQL predicate. Never interpolate a raw range string.
 *
 * `today` and `yesterday` were left behind by the SQLite migration. SQLite's
 * date('now', '-1 day') has no PostgreSQL equivalent — date() there takes one
 * argument — so `yesterday` raised "function date(unknown, unknown) does not
 * exist" and the endpoint answered 500 for a button that is right there in the
 * dashboard. `today` only survived because date('now') happens to parse as a
 * cast of the string 'now'. Both now use CURRENT_DATE.
 */
const RANGE_SQL = {
  today: 'created_at::date = CURRENT_DATE',
  yesterday: "created_at::date = CURRENT_DATE - INTERVAL '1 day'",
  last7days: "created_at >= NOW() - INTERVAL '6 days'",
  monthly: "created_at >= NOW() - INTERVAL '29 days'",
  yearly: "created_at >= NOW() - INTERVAL '364 days'",
  alltime: '1 = 1',
};

adminRouter.get(
  '/userinfo/time-range-stats',
  asyncHandler(async (req, res) => {
    const range = String(req.query.range ?? 'today').toLowerCase();
    const predicate = RANGE_SQL[range];

    if (!predicate) {
      throw ApiError.badRequest('INVALID_RANGE', `Unknown range "${range}".`, {
        supportedRanges: Object.keys(RANGE_SQL),
      });
    }

    const totals = await queryOne(
      `SELECT
         COUNT(*)                       AS conversions,
         COUNT(*) FILTER (WHERE status = 'success')        AS successes,
         COUNT(*) FILTER (WHERE status = 'failed')         AS failures,
         COALESCE(SUM(characters), 0)   AS characters,
         COALESCE(SUM(words), 0)        AS words,
         COALESCE(SUM(file_size_bytes), 0) AS bytes,
         COALESCE(ROUND(AVG(duration_ms)), 0) AS avg_duration_ms,
         COUNT(DISTINCT session_id)     AS unique_visitors
       FROM conversion_logs
       WHERE ${predicate}`,
    );

    const byLanguage = await query(
      `SELECT COALESCE(language, 'auto') AS language, COUNT(*) AS count
         FROM conversion_logs
        WHERE ${predicate}
        GROUP BY language
        ORDER BY count DESC
        LIMIT 12`,
    );

    const byCountry = await query(
      `SELECT COALESCE(country_code, '??') AS country_code, COUNT(*) AS count
         FROM conversion_logs
        WHERE ${predicate}
        GROUP BY country_code
        ORDER BY count DESC
        LIMIT 12`,
    );

    // Hourly buckets for a one-day view, daily otherwise.
    const useHourly = range === 'today' || range === 'yesterday';
    // Repeated in GROUP BY/ORDER BY: PostgreSQL does not accept an output
    // alias there for an expression.
    const bucketExpr = useHourly
      ? "to_char(date_trunc('hour', created_at), 'YYYY-MM-DD HH24:00')"
      : "to_char(created_at, 'YYYY-MM-DD')";
    const timeseries = await query(
      `SELECT ${bucketExpr} AS bucket,
              COUNT(*) AS count,
              COUNT(*) FILTER (WHERE status = 'success') AS successes
         FROM conversion_logs
        WHERE ${predicate}
        GROUP BY ${bucketExpr}
        ORDER BY ${bucketExpr} ASC`,
    );

    const conversions = Number(totals?.conversions ?? 0);
    const successes = Number(totals?.successes ?? 0);

    ok(req, res, {
      range,
      granularity: useHourly ? 'hour' : 'day',
      totals: {
        conversions,
        successes,
        failures: Number(totals?.failures ?? 0),
        successRate: conversions ? Math.round((successes / conversions) * 1000) / 10 : 0,
        characters: Number(totals?.characters ?? 0),
        words: Number(totals?.words ?? 0),
        bytes: Number(totals?.bytes ?? 0),
        avgDurationMs: Number(totals?.avg_duration_ms ?? 0),
        uniqueVisitors: Number(totals?.unique_visitors ?? 0),
      },
      byLanguage,
      byCountry,
      // SUM() and COUNT() come back as strings over the wire, so normalise here
      // rather than making every consumer remember to coerce.
      timeseries: timeseries.map((point) => ({
        bucket: String(point.bucket),
        count: Number(point.count ?? 0),
        successes: Number(point.successes ?? 0),
      })),
    });
  }),
);

/* ---------------- Logs ---------------- */

/** Clamp paging input so a caller cannot ask for a million rows. */
function paging(req, defaultLimit = 25) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || defaultLimit, 1), 100);
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  return { limit, page, offset: (page - 1) * limit };
}

adminRouter.get(
  '/logs/conversions',
  asyncHandler(async (req, res) => {
    const { limit, page, offset } = paging(req);
    const status = String(req.query.status ?? 'all').toLowerCase();

    const where = ['1 = 1'];
    const params = [];

    if (status === 'success' || status === 'failed') {
      where.push('status = ?');
      params.push(status);
    }

    const search = String(req.query.search ?? '').trim();
    if (search) {
      where.push('(file_name LIKE ? OR request_id LIKE ? OR ip_address LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const clause = where.join(' AND ');

    const rows = await query(
      `SELECT id, request_id, session_id, ip_address, country_code, file_name,
              file_size_bytes, file_format, language, model, status, error_code,
              characters, words, duration_ms, transcript_sample, created_at
         FROM conversion_logs
        WHERE ${clause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)],
    );

    const count = await queryOne(
      `SELECT COUNT(*) AS total FROM conversion_logs WHERE ${clause}`,
      params,
    );
    const total = Number(count?.total ?? 0);

    ok(req, res, {
      items: rows,
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
    });
  }),
);

adminRouter.get(
  '/logs/system-errors',
  asyncHandler(async (req, res) => {
    const { limit, page, offset } = paging(req);
    const level = String(req.query.level ?? 'all').toLowerCase();

    const where = ['1 = 1'];
    const params = [];

    if (['warn', 'error', 'fatal'].includes(level)) {
      where.push('level = ?');
      params.push(level);
    }
    if (String(req.query.unresolved ?? '') === 'true') {
      where.push('resolved_at IS NULL');
    }

    const clause = where.join(' AND ');

    const rows = await query(
      `SELECT id, request_id, level, code, message, http_status, route, method,
              ip_address, resolved_at, created_at
         FROM system_errors
        WHERE ${clause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)],
    );

    const count = await queryOne(
      `SELECT COUNT(*) AS total FROM system_errors WHERE ${clause}`,
      params,
    );
    const summary = await queryOne(
      `SELECT
         COUNT(*) FILTER (WHERE level = 'fatal') AS fatal,
         COUNT(*) FILTER (WHERE level = 'error') AS error,
         COUNT(*) FILTER (WHERE level = 'warn')  AS warn,
         COUNT(*) FILTER (WHERE resolved_at IS NULL) AS unresolved
       FROM system_errors`,
    );

    const total = Number(count?.total ?? 0);

    ok(req, res, {
      items: rows,
      summary: {
        fatal: Number(summary?.fatal ?? 0),
        error: Number(summary?.error ?? 0),
        warn: Number(summary?.warn ?? 0),
        unresolved: Number(summary?.unresolved ?? 0),
      },
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
    });
  }),
);

adminRouter.patch(
  '/logs/system-errors/:id',
  requireRole('super_admin', 'admin'),
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw ApiError.badRequest('INVALID_ID', 'Invalid error id.');

    const resolved = req.body?.resolved !== false;
    await query('UPDATE system_errors SET resolved_at = ? WHERE id = ?', [
      resolved ? new Date() : null,
      id,
    ]);

    ok(req, res, { id, resolved });
  }),
);

/* ---------------- Settings ---------------- */

async function readSetting(key, fallback) {
  const row = await queryOne(
    'SELECT setting_value, updated_at, updated_by FROM app_settings WHERE setting_key = ?',
    [key],
  );
  if (!row) return { value: fallback, updatedAt: null, updatedBy: null };
  try {
    return {
      value: readJson(row.setting_value, fallback),
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    };
  } catch {
    return { value: fallback, updatedAt: row.updated_at, updatedBy: row.updated_by };
  }
}

async function writeSetting(key, value, username) {
  await query(
    `INSERT INTO app_settings (setting_key, setting_value, updated_by)
     VALUES (?, ?, ?)
     ON CONFLICT (setting_key) DO UPDATE SET
       setting_value = excluded.setting_value,
       updated_by    = excluded.updated_by,
       updated_at    = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value), username ?? null],
  );
}

adminRouter.get(
  '/settings/limits',
  asyncHandler(async (req, res) => {
    const stored = await readSetting('upload_limits', { maxUploadSizeMb: env.MAX_UPLOAD_SIZE_MB });
    ok(req, res, {
      ...stored,
      // The env value is the ceiling: a runtime setting can lower the limit but
      // never raise it above what multer was configured to accept at boot.
      envMaxUploadSizeMb: env.MAX_UPLOAD_SIZE_MB,
    });
  }),
);

adminRouter.put(
  '/settings/limits',
  requireRole('super_admin', 'admin'),
  asyncHandler(async (req, res) => {
    const requested = Number(req.body?.maxUploadSizeMb);

    if (!Number.isFinite(requested) || requested < 1) {
      throw ApiError.badRequest('INVALID_LIMIT', 'maxUploadSizeMb must be a number of 1 or more.');
    }
    if (requested > env.MAX_UPLOAD_SIZE_MB) {
      throw ApiError.badRequest(
        'LIMIT_ABOVE_CEILING',
        `The runtime limit cannot exceed the server ceiling of ${env.MAX_UPLOAD_SIZE_MB} MB. Raise MAX_UPLOAD_SIZE_MB and restart to go higher.`,
        { ceilingMb: env.MAX_UPLOAD_SIZE_MB },
      );
    }

    const value = { maxUploadSizeMb: Math.floor(requested) };
    await writeSetting('upload_limits', value, req.admin.username);
    await recordAudit({
      username: req.admin.username,
      action: 'setting_changed',
      detail: `upload_limits -> ${JSON.stringify(value)}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    ok(req, res, { value, envMaxUploadSizeMb: env.MAX_UPLOAD_SIZE_MB });
  }),
);

adminRouter.get(
  '/settings/notice',
  asyncHandler(async (req, res) => {
    const stored = await readSetting('global_notice', {
      enabled: false,
      message: '',
      messageBn: '',
      variant: 'info',
    });
    ok(req, res, stored);
  }),
);

adminRouter.put(
  '/settings/notice',
  requireRole('super_admin', 'admin'),
  asyncHandler(async (req, res) => {
    const variant = String(req.body?.variant ?? 'info');
    if (!['info', 'warning', 'critical'].includes(variant)) {
      throw ApiError.badRequest('INVALID_VARIANT', 'variant must be info, warning or critical.');
    }

    const value = {
      enabled: Boolean(req.body?.enabled),
      message: String(req.body?.message ?? '').slice(0, 500),
      messageBn: String(req.body?.messageBn ?? '').slice(0, 500),
      variant,
    };

    if (value.enabled && !value.message.trim() && !value.messageBn.trim()) {
      throw ApiError.badRequest(
        'NOTICE_EMPTY',
        'Provide a message in at least one language before enabling the notice.',
      );
    }

    await writeSetting('global_notice', value, req.admin.username);
    await recordAudit({
      username: req.admin.username,
      action: 'setting_changed',
      detail: `global_notice -> enabled=${value.enabled}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    ok(req, res, { value });
  }),
);

/* ---------------- Security / AdminAccess ---------------- */

adminRouter.get(
  '/security/admin-access',
  asyncHandler(async (req, res) => {
    const admins = await query(
      `SELECT id, username, role, is_active, last_login_at, created_at
         FROM users ORDER BY created_at ASC`,
    );

    const audit = await query(
      `SELECT id, username, action, detail, ip_address, created_at
         FROM admin_audit_log ORDER BY created_at DESC LIMIT 50`,
    );

    const failed = await queryOne(
      `SELECT COUNT(*) AS n FROM admin_audit_log
        WHERE action = 'login_failed' AND created_at >= NOW() - INTERVAL '24 hours'`,
    );

    ok(req, res, {
      currentUser: req.admin,
      admins,
      auditLog: audit,
      posture: {
        jwtConfigured: env.JWT_CONFIGURED,
        accessTokenTtlMinutes: env.JWT_ACCESS_TTL_MIN,
        refreshTokenTtlDays: env.JWT_REFRESH_TTL_DAYS,
        loginMaxAttempts: env.ADMIN_LOGIN_MAX_ATTEMPTS,
        loginWindowMinutes: Math.round(env.ADMIN_LOGIN_WINDOW_MS / 60000),
        failedLogins24h: Number(failed?.n ?? 0),
        geoLookupEnabled: env.GEO_LOOKUP_ENABLED,
        // Sent so the form shows the rule the server actually enforces,
        // instead of keeping a second copy that can drift.
        minPasswordLength: MIN_ADMIN_PASSWORD_LENGTH,
      },
    });
  }),
);

adminRouter.post(
  '/security/password',
  asyncHandler(async (req, res) => {
    await changePassword(
      req.admin.id,
      String(req.body?.currentPassword ?? ''),
      String(req.body?.newPassword ?? ''),
    );
    await recordAudit({
      username: req.admin.username,
      action: 'password_changed',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    ok(req, res, { changed: true });
  }),
);

/* ---------------- Super Admin: Overview & System Stats ---------------- */

adminRouter.get(
  '/overview/stats',
  asyncHandler(async (req, res) => {
    // 1. User metrics
    const userSummary = await queryOne(`
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE role = 'super_admin') AS super_admins,
        COUNT(*) FILTER (WHERE role = 'admin') AS admins,
        COUNT(*) FILTER (WHERE role = 'user') AS regular_users,
        COUNT(*) FILTER (WHERE is_active = TRUE) AS active_users
      FROM users
    `);

    // 2. Tool metrics
    const toolSummary = await queryOne(`
      SELECT
        COUNT(*) AS total_tools,
        COUNT(*) FILTER (WHERE status = 'published') AS published_tools,
        COUNT(*) FILTER (WHERE is_featured = TRUE) AS featured_tools,
        COUNT(*) FILTER (WHERE is_premium = TRUE) AS premium_tools,
        COALESCE(SUM(usage_count), 0) AS total_executions
      FROM tools
    `);

    // 3. Conversion / execution stats today
    const conversionToday = await queryOne(`
      SELECT
        COUNT(*) AS today_executions,
        COUNT(*) FILTER (WHERE status = 'success') AS today_successes,
        COUNT(*) FILTER (WHERE status = 'failed') AS today_failures,
        COALESCE(SUM(characters), 0) AS today_characters
      FROM conversion_logs
      WHERE created_at::date = CURRENT_DATE
    `);

    // 4. Live Sessions & System telemetry
    const memUsage = process.memoryUsage();
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rssMb: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
      },
      environment: process.env.NODE_ENV || 'development',
      asrModel: process.env.ASR_MODEL || 'openai/whisper-large-v3-turbo',
      database: {
        engine: 'PostgreSQL 17',
        status: 'healthy',
      },
    };

    ok(req, res, {
      users: {
        total: Number(userSummary?.total_users ?? 0),
        superAdmins: Number(userSummary?.super_admins ?? 0),
        admins: Number(userSummary?.admins ?? 0),
        regularUsers: Number(userSummary?.regular_users ?? 0),
        active: Number(userSummary?.active_users ?? 0),
      },
      tools: {
        total: Number(toolSummary?.total_tools ?? 0),
        published: Number(toolSummary?.published_tools ?? 0),
        featured: Number(toolSummary?.featured_tools ?? 0),
        premium: Number(toolSummary?.premium_tools ?? 0),
        totalExecutions: Number(toolSummary?.total_executions ?? 0),
      },
      todayActivity: {
        executions: Number(conversionToday?.today_executions ?? 0),
        successes: Number(conversionToday?.today_successes ?? 0),
        failures: Number(conversionToday?.today_failures ?? 0),
        characters: Number(conversionToday?.today_characters ?? 0),
      },
      system: systemInfo,
    });
  }),
);

/* ---------------- Super Admin: Master Tools Manager ---------------- */

adminRouter.get(
  '/tools/list',
  asyncHandler(async (req, res) => {
    const { limit, page, offset } = paging(req, 20);
    const search = String(req.query.search ?? '').trim();
    const moduleFilter = String(req.query.module ?? '').trim();
    const statusFilter = String(req.query.status ?? '').trim();
    const featuredFilter = req.query.featured;

    const where = ['1 = 1'];
    const params = [];

    if (search) {
      where.push('(t.name ILIKE ? OR t.slug ILIKE ? OR t.tagline ILIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (moduleFilter && moduleFilter !== 'all') {
      where.push("t.metadata->>'module' = ?");
      params.push(moduleFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      where.push('t.status = ?');
      params.push(statusFilter);
    }

    if (featuredFilter !== undefined && featuredFilter !== 'all') {
      where.push('t.is_featured = ?');
      params.push(featuredFilter === 'true');
    }

    const clause = where.join(' AND ');

    const rows = await query(
      `SELECT t.id, t.slug, t.name, t.tagline, t.description, t.route,
              t.icon, t.tags, t.status, t.is_featured, t.is_premium,
              t.usage_count, t.sort_order, t.metadata, t.created_at, t.updated_at,
              c.slug AS category_slug, c.name AS category_name
       FROM tools t
       JOIN categories c ON c.id = t.category_id
       WHERE ${clause}
       ORDER BY t.sort_order ASC, t.usage_count DESC, t.name ASC
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)],
    );

    const count = await queryOne(
      `SELECT COUNT(*) AS total
       FROM tools t
       JOIN categories c ON c.id = t.category_id
       WHERE ${clause}`,
      params,
    );

    const total = Number(count?.total ?? 0);

    ok(req, res, {
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        tagline: r.tagline,
        description: r.description,
        route: r.route,
        icon: r.icon,
        tags: r.tags,
        status: r.status,
        isFeatured: r.is_featured,
        isPremium: r.is_premium,
        usageCount: Number(r.usage_count ?? 0),
        sortOrder: r.sort_order,
        module: r.metadata?.module ?? '',
        categorySlug: r.category_slug,
        categoryName: r.category_name,
        metadata: r.metadata,
      })),
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
    });
  }),
);

adminRouter.patch(
  '/tools/:slug',
  requireRole('super_admin', 'admin'),
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug).trim().toLowerCase();
    const existing = await queryOne(
      'SELECT id, name, status, is_featured, is_premium, metadata FROM tools WHERE slug = ?',
      [slug],
    );
    if (!existing) {
      throw new ApiError(404, 'TOOL_NOT_FOUND', `Tool with slug "${slug}" not found.`);
    }

    const sets = ['updated_at = NOW()'];
    const params = [];

    if (req.body?.status !== undefined) {
      const status = String(req.body.status);
      if (!['draft', 'published', 'archived'].includes(status)) {
        throw ApiError.badRequest(
          'INVALID_STATUS',
          'Status must be draft, published, or archived.',
        );
      }
      sets.push('status = ?');
      params.push(status);
      if (status === 'published') {
        sets.push('published_at = COALESCE(published_at, NOW())');
      }
    }

    if (req.body?.isFeatured !== undefined) {
      sets.push('is_featured = ?');
      params.push(Boolean(req.body.isFeatured));
    }

    if (req.body?.isPremium !== undefined) {
      sets.push('is_premium = ?');
      params.push(Boolean(req.body.isPremium));
    }

    if (req.body?.name !== undefined && String(req.body.name).trim()) {
      sets.push('name = ?');
      params.push(String(req.body.name).trim());
    }

    if (req.body?.tagline !== undefined) {
      sets.push('tagline = ?');
      params.push(String(req.body.tagline).trim());
    }

    if (req.body?.description !== undefined) {
      sets.push('description = ?');
      params.push(String(req.body.description).trim());
    }

    if (Array.isArray(req.body?.tags)) {
      sets.push('tags = ?');
      params.push(req.body.tags);
    }

    params.push(slug);

    await query(`UPDATE tools SET ${sets.join(', ')} WHERE slug = ?`, params);

    const updated = await queryOne('SELECT * FROM tools WHERE slug = ?', [slug]);

    await recordAudit({
      username: req.admin.username,
      action: 'tool_updated',
      detail: `Tool "${slug}" modified: ${JSON.stringify(req.body)}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    ok(req, res, { tool: updated });
  }),
);

adminRouter.post(
  '/tools/sync',
  requireRole('super_admin'),
  asyncHandler(async (req, res) => {
    const result = await syncToolsSeed();
    await recordAudit({
      username: req.admin.username,
      action: 'tools_synced',
      detail: `Tools registry resynced: ${result.total} tools`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    ok(req, res, { result, message: 'Tools catalog successfully synchronized.' });
  }),
);

/* ---------------- Super Admin: Monetization & Ad Manager ---------------- */

adminRouter.get(
  '/settings/monetization',
  asyncHandler(async (req, res) => {
    const stored = await readSetting('monetization_config', {
      adsensePubId: '',
      autoAdsEnabled: false,
      topBannerEnabled: false,
      sidebarBannerEnabled: false,
      inContentAdEnabled: false,
      adBlockNoticeEnabled: false,
      headerScripts: '',
      customSponsorHtml: '',
      sponsorName: '',
      sponsorLink: '',
    });
    ok(req, res, stored);
  }),
);

adminRouter.put(
  '/settings/monetization',
  requireRole('super_admin'),
  asyncHandler(async (req, res) => {
    const value = {
      adsensePubId: String(req.body?.adsensePubId ?? '')
        .trim()
        .slice(0, 100),
      autoAdsEnabled: Boolean(req.body?.autoAdsEnabled),
      topBannerEnabled: Boolean(req.body?.topBannerEnabled),
      sidebarBannerEnabled: Boolean(req.body?.sidebarBannerEnabled),
      inContentAdEnabled: Boolean(req.body?.inContentAdEnabled),
      adBlockNoticeEnabled: Boolean(req.body?.adBlockNoticeEnabled),
      headerScripts: String(req.body?.headerScripts ?? '')
        .trim()
        .slice(0, 4000),
      customSponsorHtml: String(req.body?.customSponsorHtml ?? '')
        .trim()
        .slice(0, 4000),
      sponsorName: String(req.body?.sponsorName ?? '')
        .trim()
        .slice(0, 100),
      sponsorLink: String(req.body?.sponsorLink ?? '')
        .trim()
        .slice(0, 500),
    };

    await writeSetting('monetization_config', value, req.admin.username);
    await recordAudit({
      username: req.admin.username,
      action: 'setting_changed',
      detail: `monetization_config updated: pubId=${value.adsensePubId}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    ok(req, res, { value, message: 'Monetization & Ad settings saved successfully.' });
  }),
);

/* ---------------- Super Admin: User & Role Management ---------------- */

adminRouter.get(
  '/users/list',
  asyncHandler(async (req, res) => {
    const { limit, page, offset } = paging(req, 20);
    const search = String(req.query.search ?? '').trim();
    const roleFilter = String(req.query.role ?? '').trim();
    const statusFilter = req.query.status;

    const where = ['1 = 1'];
    const params = [];

    if (search) {
      where.push('(username ILIKE ? OR email ILIKE ? OR full_name ILIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (roleFilter && roleFilter !== 'all') {
      where.push('role = ?');
      params.push(roleFilter);
    }

    if (statusFilter !== undefined && statusFilter !== 'all') {
      where.push('is_active = ?');
      params.push(statusFilter === 'true');
    }

    const clause = where.join(' AND ');

    const rows = await query(
      `SELECT id, username, email, full_name, role, is_active, last_login_at, created_at, updated_at
       FROM users
       WHERE ${clause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)],
    );

    const count = await queryOne(`SELECT COUNT(*) AS total FROM users WHERE ${clause}`, params);
    const total = Number(count?.total ?? 0);

    ok(req, res, {
      items: rows,
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
    });
  }),
);

adminRouter.patch(
  '/users/:id/role',
  requireRole('super_admin'),
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw ApiError.badRequest('INVALID_ID', 'Invalid user ID.');

    const newRole = String(req.body?.role ?? '').trim();
    if (!['user', 'admin', 'super_admin'].includes(newRole)) {
      throw ApiError.badRequest('INVALID_ROLE', 'Role must be user, admin, or super_admin.');
    }

    // Safety guard: prevent demoting oneself if you are the logged in super_admin
    if (req.admin.id === id && newRole !== 'super_admin') {
      throw new ApiError(
        400,
        'CANNOT_DEMOTE_SELF',
        'You cannot demote your own Super Admin account.',
      );
    }

    const targetUser = await queryOne('SELECT id, username, role FROM users WHERE id = ?', [id]);
    if (!targetUser) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');

    await query('UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?', [newRole, id]);

    await recordAudit({
      username: req.admin.username,
      action: 'user_role_changed',
      detail: `User "${targetUser.username}" (ID ${id}) role changed from ${targetUser.role} to ${newRole}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const updated = await queryOne(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?',
      [id],
    );
    ok(req, res, { user: updated });
  }),
);

adminRouter.patch(
  '/users/:id/status',
  requireRole('super_admin'),
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw ApiError.badRequest('INVALID_ID', 'Invalid user ID.');

    const isActive = Boolean(req.body?.isActive);

    // Safety guard: prevent banning oneself
    if (req.admin.id === id && !isActive) {
      throw new ApiError(400, 'CANNOT_BAN_SELF', 'You cannot deactivate your own account.');
    }

    const targetUser = await queryOne('SELECT id, username, is_active FROM users WHERE id = ?', [
      id,
    ]);
    if (!targetUser) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');

    await query('UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?', [isActive, id]);

    await recordAudit({
      username: req.admin.username,
      action: isActive ? 'user_unbanned' : 'user_banned',
      detail: `User "${targetUser.username}" (ID ${id}) active status set to ${isActive}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const updated = await queryOne(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?',
      [id],
    );
    ok(req, res, { user: updated });
  }),
);

adminRouter.delete(
  '/users/:id',
  requireRole('super_admin'),
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw ApiError.badRequest('INVALID_ID', 'Invalid user ID.');

    if (req.admin.id === id) {
      throw new ApiError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account.');
    }

    const targetUser = await queryOne('SELECT id, username FROM users WHERE id = ?', [id]);
    if (!targetUser) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');

    await query('DELETE FROM users WHERE id = ?', [id]);

    await recordAudit({
      username: req.admin.username,
      action: 'user_deleted',
      detail: `User "${targetUser.username}" (ID ${id}) deleted`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    ok(req, res, { deleted: true, id });
  }),
);

export default adminRouter;
