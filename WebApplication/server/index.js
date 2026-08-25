/**
 * iNWebTools — Enterprise API Server
 * ==================================
 *
 * Express server that accepts an audio upload, forwards it to the Hugging Face
 * Free Inference API (Whisper), returns the transcript, and deletes the file.
 *
 * Endpoints
 *   GET  /health           Liveness/readiness probe
 *   GET  /api/info         Non-sensitive server configuration
 *   POST /api/transcribe   multipart/form-data, field "audio"
 *
 * Guarantees
 *   - Uploads are capped, extension/MIME/magic-byte validated
 *   - Uploaded files are ALWAYS deleted, success or failure
 *   - The Hugging Face token never leaves the server
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { MAX_UPLOAD_BYTES, env } from './config/env.js';
import { closeDatabase, initDatabase, isReady as dbReady } from './db/index.js';
import {
  SUPPORTED_LANGUAGES,
  normaliseLanguage,
  normaliseMulterError,
  uploadAudio,
  verifyAudioSignature,
} from './middlewares/upload.js';
import { adminRouter } from './routes/admin.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { layoutRouter } from './routes/layout.routes.js';
import { widgetsRouter } from './routes/widgets.routes.js';
import { logConversion, logSystemError, touchSession } from './services/analytics.service.js';
import { transcribeAudio } from './services/huggingface.service.js';
import { ApiError, asyncHandler } from './utils/ApiError.js';
import { logger } from './utils/logger.js';

const app = express();
const startedAt = Date.now();

/* ------------------------------------------------------------------ *
 * Core middleware
 * ------------------------------------------------------------------ */

// Trust the X-Forwarded-For header ONLY when a reverse proxy is configured.
// Defaults to false: otherwise any client could forge that header and rotate
// through fake IPs to defeat rate limiting.
app.set('trust proxy', env.TRUST_PROXY);
app.disable('x-powered-by');

app.use(
  helmet({
    // The SPA is served from a different origin in development.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin/non-browser callers (curl, health checks, mobile apps).
      if (!origin) return callback(null, true);
      if (env.CORS_ORIGIN.includes('*') || env.CORS_ORIGIN.includes(origin)) {
        return callback(null, true);
      }
      // In development the app is often reached through an ephemeral tunnel
      // host (cloud IDEs, sandbox previews) whose origin cannot be known in
      // advance. Production stays restricted to the configured allow-list.
      if (!env.IS_PRODUCTION) {
        return callback(null, true);
      }
      return callback(new ApiError(403, 'CORS_FORBIDDEN', `Origin "${origin}" is not allowed.`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  }),
);

// Small JSON bodies only — audio arrives as multipart, not JSON.
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

// Correlation id for tracing a request across log lines.
app.use((req, res, next) => {
  req.id = req.get('x-request-id') || crypto.randomUUID();
  req.startedAt = process.hrtime.bigint();
  res.setHeader('X-Request-Id', req.id);
  next();
});

/**
 * Visitor session id, used by the admin dashboard's "online now" view.
 *
 * A first-party cookie holding nothing but an opaque UUID: no personal data,
 * and it never leaves this origin. Admin traffic is excluded so operators do
 * not appear in their own analytics.
 */
app.use((req, res, next) => {
  if (req.path.startsWith('/api/admin')) return next();

  const cookies = req.get('cookie') ?? '';
  const match = cookies.match(/(?:^|;\s*)a2t_sid=([0-9a-f-]{36})/i);
  let sessionId = match?.[1];

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    res.setHeader(
      'Set-Cookie',
      `a2t_sid=${sessionId}; Path=/; Max-Age=86400; SameSite=Lax; HttpOnly${
        env.IS_PRODUCTION ? '; Secure' : ''
      }`,
    );
  }

  req.sessionId = sessionId;
  // Detached: analytics must never add latency to a user's request.
  void touchSession({ sessionId, ip: req.ip, userAgent: req.get('user-agent') });
  next();
});

/* ------------------------------------------------------------------ *
 * Rate limiting — 20 requests / 15 minutes / IP on the AI endpoint
 * ------------------------------------------------------------------ */

const transcribeLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Health checks and CI must not exhaust the quota.
  skip: () => env.IS_TEST,
  handler: (req, res) => {
    const retryAfter = Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000);
    logger.warn('Rate limit exceeded', { requestId: req.id, ip: req.ip });
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many requests. Limit is ${env.RATE_LIMIT_MAX_REQUESTS} per ${Math.round(
          env.RATE_LIMIT_WINDOW_MS / 60000,
        )} minutes.`,
        details: { retryAfterSeconds: retryAfter },
      },
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  },
});

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Delete an uploaded file; never let cleanup failure mask the real result. */
async function deleteFileSafely(filePath, requestId) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
    logger.debug('Temporary file deleted', { requestId, file: path.basename(filePath) });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.error('Failed to delete temporary file', {
        requestId,
        file: path.basename(filePath),
        error: error.message,
      });
    }
  }
}

const elapsedMs = (req) =>
  req.startedAt ? Number(process.hrtime.bigint() - req.startedAt) / 1e6 : undefined;

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */

/**
 * Version reported by /health, read from the runtime manifest rather than
 * written here. It was a literal '1.0.0' string until the 1.0.2 release, when
 * the probe was found still announcing 1.0.0 — a hardcoded copy is one more
 * place to remember during a version bump, and it is the place nobody checks.
 */
const APP_VERSION = (() => {
  try {
    const manifest = path.join(path.dirname(fileURLToPath(import.meta.url)), 'package.json');
    return JSON.parse(fs.readFileSync(manifest, 'utf8')).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
})();

/** GET /health — liveness/readiness probe. */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      project: env.PROJECT_NAME,
      version: APP_VERSION,
      environment: env.NODE_ENV,
      uptimeSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
      model: env.HF_MODEL,
      // Surfaces misconfiguration without leaking the token itself.
      transcriptionReady: env.HF_TOKEN_CONFIGURED,
      databaseReady: dbReady(),
      adminAuthReady: env.JWT_CONFIGURED,
    },
    meta: { requestId: req.id, timestamp: new Date().toISOString() },
  });
});

/** GET /api/info — non-sensitive limits the client needs to validate uploads. */
app.get('/api/info', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      project: env.PROJECT_NAME,
      model: env.HF_MODEL,
      maxUploadSizeMb: env.MAX_UPLOAD_SIZE_MB,
      allowedExtensions: ['.mp3', '.wav', '.m4a'],
      supportedLanguages: SUPPORTED_LANGUAGES,
      languageCount: SUPPORTED_LANGUAGES.length,
      rateLimit: {
        maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
        windowMinutes: Math.round(env.RATE_LIMIT_WINDOW_MS / 60000),
      },
    },
    meta: { requestId: req.id, timestamp: new Date().toISOString() },
  });
});

/**
 * POST /api/transcribe
 * Body: multipart/form-data with a single field "audio".
 */
app.post(
  '/api/transcribe',
  transcribeLimiter,
  // Run multer manually so its errors join our error contract.
  (req, res, next) =>
    uploadAudio(req, res, (err) => (err ? next(normaliseMulterError(err)) : next())),
  asyncHandler(async (req, res) => {
    const file = req.file;

    if (!file) {
      throw ApiError.badRequest(
        'NO_FILE',
        'No audio file received. Send multipart/form-data with a field named "audio".',
      );
    }

    // Optional decoding hint; undefined means auto-detect.
    const language = normaliseLanguage(req.body?.language);

    logger.info('Transcription requested', {
      requestId: req.id,
      name: file.originalname,
      sizeBytes: file.size,
      mimeType: file.mimetype,
      language: language ?? 'auto',
    });

    try {
      // Confirm the bytes match the claimed format before paying for inference.
      const format = await verifyAudioSignature(file.path);

      const { text, model, attempts } = await transcribeAudio({
        filePath: file.path,
        format,
        language,
        requestId: req.id,
      });

      const durationMs = Math.round(elapsedMs(req) ?? 0);
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;

      logger.info('Transcription completed', {
        requestId: req.id,
        durationMs,
        characters: text.length,
        attempts,
      });

      void logConversion({
        requestId: req.id,
        sessionId: req.sessionId,
        ip: req.ip,
        fileName: file.originalname,
        fileSizeBytes: file.size,
        fileFormat: format,
        language: language ?? 'auto',
        model,
        status: 'success',
        characters: text.length,
        words,
        durationMs,
        transcriptSample: text,
      });

      res.status(200).json({
        success: true,
        data: {
          text,
          model,
          characters: text.length,
          words,
          language: language ?? 'auto',
          file: {
            name: file.originalname,
            sizeBytes: file.size,
            format,
          },
        },
        meta: { requestId: req.id, durationMs, timestamp: new Date().toISOString() },
      });
    } catch (error) {
      // Record the failure before rethrowing so the dashboard sees both outcomes.
      void logConversion({
        requestId: req.id,
        sessionId: req.sessionId,
        ip: req.ip,
        fileName: file.originalname,
        fileSizeBytes: file.size,
        language: language ?? 'auto',
        model: env.HF_MODEL,
        status: 'failed',
        errorCode: error?.code ?? 'INTERNAL_ERROR',
        durationMs: Math.round(elapsedMs(req) ?? 0),
      });
      throw error;
    } finally {
      // Always delete the upload — success, validation failure or provider error.
      await deleteFileSafely(file.path, req.id);
    }
  }),
);

/* ------------------------------------------------------------------ *
 * Admin dashboard API
 * ------------------------------------------------------------------ */

// Public authentication: sign-up, sign-in, password reset.
app.use('/api/auth', authRouter);

app.use('/api/admin', adminRouter);

/* ------------------------------------------------------------------ *
 * Header/footer CMS
 *
 * Mounted outside /api/admin because the GET is public — the website reads it
 * on first paint. The POST inside this router carries its own admin guard.
 * ------------------------------------------------------------------ */

app.use('/api/layout', layoutRouter);

/* ------------------------------------------------------------------ *
 * Sidebar widget engine
 *
 * Same shape as the header/footer CMS: a public GET the website renders from,
 * an admin-guarded POST that writes it. Mounted separately because the widget
 * document has its own lifecycle and its own catalogue endpoint.
 * ------------------------------------------------------------------ */

app.use('/api/widgets', widgetsRouter);

/* ------------------------------------------------------------------ *
 * 404 + centralised error handling
 * ------------------------------------------------------------------ */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} does not exist.` },
    meta: { requestId: req.id, timestamp: new Date().toISOString() },
  });
});

// `_next` is unused but required: Express identifies error handlers by arity (4 args).
app.use(async (err, req, res, _next) => {
  // If multer stored a file before the failure, clean it up.
  if (req.file?.path) await deleteFileSafely(req.file.path, req.id);

  const isApiError = err instanceof ApiError;
  const status = isApiError ? err.status : 500;
  const code = isApiError ? err.code : 'INTERNAL_ERROR';

  const message =
    isApiError || !env.IS_PRODUCTION
      ? err.message
      : 'An unexpected error occurred. Please try again.';

  const log = status >= 500 ? logger.error : logger.warn;
  log('Request failed', {
    requestId: req.id,
    status,
    code,
    message: err.message,
    ...(status >= 500 && !env.IS_PRODUCTION ? { stack: err.stack } : {}),
  });

  // Persist for the dashboard. Client-side 4xx noise (a bad upload, an expired
  // token) is not an operator concern, so only 5xx and auth/config faults are
  // stored — otherwise the table fills with things nobody can act on.
  const worthRecording =
    status >= 500 || ['DATABASE_UNAVAILABLE', 'HF_TOKEN_MISSING'].includes(code);
  if (worthRecording) {
    void logSystemError({
      requestId: req.id,
      level: status >= 500 ? 'error' : 'warn',
      code,
      message: err.message,
      httpStatus: status,
      route: req.originalUrl,
      method: req.method,
      ip: req.ip,
      stack: env.IS_PRODUCTION ? null : err.stack,
    });
  }

  if (res.headersSent) return;

  res.status(status).json({
    success: false,
    error: { code, message, ...(isApiError && err.details ? { details: err.details } : {}) },
    meta: { requestId: req.id, timestamp: new Date().toISOString() },
  });
});

/* ------------------------------------------------------------------ *
 * Startup
 * ------------------------------------------------------------------ */

function start() {
  // Fire and forget: a database outage disables the dashboard but must not
  // stop the transcription API from serving traffic.
  void initDatabase();

  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(`${env.PROJECT_NAME} API server started`, {
      url: `http://${env.HOST}:${env.PORT}`,
      environment: env.NODE_ENV,
      model: env.HF_MODEL,
      maxUploadMb: env.MAX_UPLOAD_SIZE_MB,
      rateLimit: `${env.RATE_LIMIT_MAX_REQUESTS}/${Math.round(env.RATE_LIMIT_WINDOW_MS / 60000)}min`,
    });

    if (!env.HF_TOKEN_CONFIGURED) {
      logger.warn(
        'HF_FREE_API_TOKEN is not set — /api/transcribe will return 503 until it is configured.',
      );
    }
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
    // Do not hang forever on lingering keep-alive sockets.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });

  return server;
}

// Only listen when run directly, so tests can import `app` without a port.
if (process.env.NODE_ENV !== 'test') {
  start();
}

export { MAX_UPLOAD_BYTES, app, start };
export default app;
