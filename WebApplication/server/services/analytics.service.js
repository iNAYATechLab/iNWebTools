/**
 * Visitor tracking, conversion logging and geo enrichment.
 *
 * Everything here is best-effort: analytics must never fail a user's
 * transcription. Each writer swallows its own errors and logs them.
 */

import { env } from '../config/env.js';
import { isReady, query, queryOne } from '../db/index.js';
import { logger } from '../utils/logger.js';

/* ------------------------------------------------------------------ *
 * User-agent parsing
 *
 * A dependency-free parser. Full UA libraries carry large, frequently
 * updated regex tables; for a dashboard that needs "Chrome on Android"
 * this is enough and cannot go stale in a lockfile.
 * ------------------------------------------------------------------ */

export function parseUserAgent(ua = '') {
  const s = String(ua);
  const has = (re) => re.test(s);

  if (!s.trim()) return { deviceType: 'unknown', browser: 'Unknown', os: 'Unknown' };

  // Bots first: they often also match mobile/desktop patterns.
  if (has(/bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview/i)) {
    return { deviceType: 'bot', browser: 'Bot', os: 'Unknown' };
  }

  const isTablet = has(/ipad|tablet|playbook|silk/i) || (has(/android/i) && !has(/mobile/i));
  const isMobile = has(/mobi|iphone|ipod|android.*mobile|windows phone|blackberry/i);
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

  // Order matters: Edge and Opera both advertise Chrome, Chrome advertises Safari.
  const browser = has(/edg(e|a|ios)?\//i)
    ? 'Edge'
    : has(/opr\/|opera/i)
      ? 'Opera'
      : has(/samsungbrowser/i)
        ? 'Samsung Internet'
        : has(/firefox|fxios/i)
          ? 'Firefox'
          : has(/chrome|crios/i)
            ? 'Chrome'
            : has(/safari/i)
              ? 'Safari'
              : 'Unknown';

  const os = has(/windows nt/i)
    ? 'Windows'
    : has(/android/i)
      ? 'Android'
      : has(/iphone|ipad|ipod|ios/i)
        ? 'iOS'
        : has(/mac os x|macintosh/i)
          ? 'macOS'
          : has(/cros/i)
            ? 'ChromeOS'
            : has(/linux/i)
              ? 'Linux'
              : 'Unknown';

  return { deviceType, browser, os };
}

/* ------------------------------------------------------------------ *
 * Geo-IP enrichment
 * ------------------------------------------------------------------ */

/** Private/loopback ranges never resolve to a country — skip the round trip. */
export function isPrivateIp(ip = '') {
  const v = String(ip).replace(/^::ffff:/, '');
  if (!v || v === '::1' || v === '127.0.0.1') return true;
  if (/^10\./.test(v) || /^192\.168\./.test(v)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(v)) return true;
  if (/^169\.254\./.test(v)) return true;
  if (/^(fc|fd|fe80)/i.test(v)) return true;
  return false;
}

/**
 * Resolve country/ISP for an IP.
 *
 * Sends the address to a third-party service, so it is opt-in via
 * GEO_LOOKUP_ENABLED and documented in the README.
 */
export async function lookupGeo(ip) {
  if (!env.GEO_LOOKUP_ENABLED) return { geo_status: 'skipped' };
  if (isPrivateIp(ip)) return { geo_status: 'skipped' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.GEO_API_TIMEOUT_MS);

  try {
    const url = `${env.GEO_API_URL}/${encodeURIComponent(ip)}?fields=status,country,countryCode,city,isp`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return { geo_status: 'failed' };

    const body = await res.json();
    if (body.status !== 'success') return { geo_status: 'failed' };

    return {
      country: body.country ?? null,
      country_code: body.countryCode ?? null,
      city: body.city ?? null,
      isp: body.isp ?? null,
      geo_status: 'ok',
    };
  } catch {
    return { geo_status: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ *
 * Session tracking
 * ------------------------------------------------------------------ */

/**
 * Upsert the visitor session for this request.
 *
 * Called from a middleware on every public request. Geo lookup runs detached
 * so a slow third-party API never delays the response.
 */
export async function touchSession({ sessionId, ip, userAgent }) {
  if (!isReady() || !sessionId) return;

  const { deviceType, browser, os } = parseUserAgent(userAgent);

  try {
    await query(
      `INSERT INTO visitor_sessions
         (session_id, ip_address, user_agent, device_type, browser, os)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (session_id) DO UPDATE SET
         last_seen_at = CURRENT_TIMESTAMP,
         -- Table-qualified: inside DO UPDATE an unqualified name is ambiguous
         -- between the existing row and the proposed one.
         page_views   = visitor_sessions.page_views + 1,
         ip_address   = excluded.ip_address,
         user_agent   = excluded.user_agent,
         device_type  = excluded.device_type,
         browser      = excluded.browser,
         os           = excluded.os`,
      [sessionId, ip ?? '', (userAgent ?? '').slice(0, 512) || null, deviceType, browser, os],
    );

    // Enrich once per session, in the background.
    if (env.GEO_LOOKUP_ENABLED) {
      const row = await queryOne(
        'SELECT geo_status FROM visitor_sessions WHERE session_id = ? LIMIT 1',
        [sessionId],
      );
      if (row?.geo_status === 'pending') void enrichSessionGeo(sessionId, ip);
    }
  } catch (error) {
    logger.debug('Session tracking failed', { error: error.message });
  }
}

async function enrichSessionGeo(sessionId, ip) {
  try {
    const geo = await lookupGeo(ip);
    await query(
      `UPDATE visitor_sessions
          SET country = ?, country_code = ?, city = ?, isp = ?, geo_status = ?
        WHERE session_id = ?`,
      [
        geo.country ?? null,
        geo.country_code ?? null,
        geo.city ?? null,
        geo.isp ?? null,
        geo.geo_status,
        sessionId,
      ],
    );
  } catch (error) {
    logger.debug('Geo enrichment failed', { error: error.message });
  }
}

/* ------------------------------------------------------------------ *
 * Conversion + error logging
 * ------------------------------------------------------------------ */

export async function logConversion(entry) {
  if (!isReady()) return;
  try {
    await query(
      `INSERT INTO conversion_logs
         (request_id, session_id, ip_address, country_code, file_name, file_size_bytes,
          file_format, language, model, status, error_code, characters, words,
          duration_ms, transcript_sample)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.requestId,
        entry.sessionId ?? null,
        entry.ip ?? null,
        entry.countryCode ?? null,
        entry.fileName?.slice(0, 255) ?? null,
        entry.fileSizeBytes ?? null,
        entry.fileFormat ?? null,
        entry.language ?? null,
        entry.model ?? null,
        entry.status,
        entry.errorCode ?? null,
        entry.characters ?? null,
        entry.words ?? null,
        entry.durationMs ?? null,
        // Store a short preview only — the full transcript is the user's data.
        entry.transcriptSample?.slice(0, 280) ?? null,
      ],
    );
  } catch (error) {
    logger.debug('Conversion logging failed', { error: error.message });
  }
}

export async function logSystemError(entry) {
  if (!isReady()) return;
  try {
    await query(
      `INSERT INTO system_errors
         (request_id, level, code, message, http_status, route, method, ip_address, stack)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.requestId ?? null,
        entry.level ?? 'error',
        entry.code,
        entry.message,
        entry.httpStatus ?? null,
        entry.route?.slice(0, 255) ?? null,
        entry.method ?? null,
        entry.ip ?? null,
        entry.stack ?? null,
      ],
    );
  } catch (error) {
    logger.debug('System error logging failed', { error: error.message });
  }
}
