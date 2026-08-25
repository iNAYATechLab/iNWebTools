/**
 * Environment loading and validation.
 *
 * Fails fast at boot with a readable message rather than throwing a cryptic
 * error on the first request.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, '..');

// Load server/.env first — dotenv never overwrites an already-set variable, so
// the server's own file wins over the shared WebApplication/.env fallback.
// Tests set NODE_ENV=test and their own variables before importing this module,
// so a developer's local .env can never change a test outcome.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: path.join(SERVER_ROOT, '.env') });
  dotenv.config({ path: path.resolve(SERVER_ROOT, '..', '.env') });
}

const PLACEHOLDER_TOKENS = new Set([
  'your_hugging_face_token_here',
  'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'hf_dummy_token_for_ci',
  '',
]);

/** Read an integer with a default and a sane lower bound. */
function int(name, fallback, { min = 0 } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value < min) {
    throw new Error(`Invalid ${name}="${raw}" — expected an integer >= ${min}.`);
  }
  return value;
}

/**
 * Parse the Express `trust proxy` setting.
 *
 * SECURITY: this must default to `false`. Trusting the proxy makes Express take
 * the client IP from `X-Forwarded-For`, which any caller can forge — so a
 * wrongly-enabled value lets an attacker rotate that header and bypass rate
 * limiting entirely. Only enable it when a reverse proxy really does sit in
 * front and overwrite the header.
 *
 * Accepts: false (default) | true | an integer hop count | a comma-separated
 * list of trusted IPs/subnets.
 */
function trustProxy(name) {
  const raw = (process.env[name] ?? '').trim();
  if (raw === '' || raw.toLowerCase() === 'false' || raw === '0') return false;
  if (raw.toLowerCase() === 'true') return true;

  const hops = Number.parseInt(raw, 10);
  if (!Number.isNaN(hops) && String(hops) === raw) return hops;

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Strip surrounding quotes that dotenv preserves for quoted values. */
function str(name, fallback = '') {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw.replace(/^["']|["']$/g, '').trim();
}

/** Read a boolean; only the literal strings "true"/"false" are honoured. */
function bool(name, fallback) {
  const raw = str(name);
  if (raw === '') return fallback;
  const value = raw.toLowerCase();
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

const NODE_ENV = str('NODE_ENV', 'development');

// The HF token is required to transcribe, but the server must still boot
// (and answer /health) without it so operators can diagnose the problem.
const rawToken = str('HF_FREE_API_TOKEN') || str('HUGGINGFACE_API_KEY');

// Tests must never reach the real Hugging Face API: a live call makes the suite
// slow, flaky and dependent on an external service, and CI supplies a dummy
// token that would otherwise be treated as real (the request then hangs until
// vitest times out). Under NODE_ENV=test the token is therefore ignored, so
// /api/transcribe short-circuits with 503 HF_TOKEN_MISSING. A test that needs a
// configured token must set ALLOW_HF_NETWORK_IN_TESTS=true and point
// HF_API_BASE_URL at a local mock.
const networkAllowedInTests = str('ALLOW_HF_NETWORK_IN_TESTS').toLowerCase() === 'true';
const tokenSuppressed = NODE_ENV === 'test' && !networkAllowedInTests;

const hfToken = tokenSuppressed || PLACEHOLDER_TOKENS.has(rawToken) ? '' : rawToken;

// Admin JWT signing key. A short or placeholder value is treated as absent so
// the dashboard fails closed instead of trusting forgeable tokens. Tests get a
// deterministic key: they must exercise the auth flow without a real secret.
const rawJwtSecret = str('JWT_SECRET');
const jwtSecret =
  NODE_ENV === 'test'
    ? 'test-only-jwt-secret-not-used-in-production'
    : rawJwtSecret.length >= 32 && !PLACEHOLDER_TOKENS.has(rawJwtSecret)
      ? rawJwtSecret
      : '';

if (!jwtSecret && NODE_ENV !== 'test') {
  // Not fatal: the public transcription API works without an admin dashboard.
  console.warn(
    '[env] JWT_SECRET is missing or shorter than 32 characters — admin login is disabled.',
  );
}

export const env = Object.freeze({
  PROJECT_NAME: str('PROJECT_NAME', 'iNWebTools'),

  NODE_ENV,
  IS_PRODUCTION: NODE_ENV === 'production',
  IS_TEST: NODE_ENV === 'test',
  PORT: int('PORT', 5000, { min: 1 }),
  HOST: str('HOST', '0.0.0.0'),
  // Secure by default: do not believe X-Forwarded-For unless told to.
  TRUST_PROXY: trustProxy('TRUST_PROXY'),

  HF_FREE_API_TOKEN: hfToken,
  HF_TOKEN_CONFIGURED: hfToken.length > 0,
  HF_MODEL: str('HF_MODEL', 'openai/whisper-large-v3'),
  HF_API_BASE_URL: str(
    'HF_API_BASE_URL',
    // api-inference.huggingface.co was retired; the hf-inference provider on the
    // router is the current home for hosted ASR models such as Whisper.
    'https://router.huggingface.co/hf-inference/models',
  ).replace(/\/+$/, ''),
  HF_REQUEST_TIMEOUT_MS: int('HF_REQUEST_TIMEOUT_MS', 180_000, { min: 1000 }),
  HF_MAX_RETRIES: int('HF_MAX_RETRIES', 3, { min: 0 }),
  HF_RETRY_BASE_DELAY_MS: int('HF_RETRY_BASE_DELAY_MS', 2000, { min: 0 }),

  MAX_UPLOAD_SIZE_MB: int('MAX_UPLOAD_SIZE_MB', 10, { min: 1 }),
  UPLOAD_TMP_DIR: path.isAbsolute(str('UPLOAD_TMP_DIR', './tmp'))
    ? str('UPLOAD_TMP_DIR', './tmp')
    : path.join(SERVER_ROOT, str('UPLOAD_TMP_DIR', './tmp')),

  CORS_ORIGIN: str('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  RATE_LIMIT_WINDOW_MS: int('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000, { min: 1000 }),
  RATE_LIMIT_MAX_REQUESTS: int('RATE_LIMIT_MAX_REQUESTS', 20, { min: 1 }),

  /* ---------------- Admin dashboard ---------------- */

  // The dashboard is optional: with DB_ENABLED=false the transcription API
  // keeps working and /api/admin/* answers 503 by design. Tests run without a
  // database server, so it defaults off there.
  DB_ENABLED: bool('DB_ENABLED', NODE_ENV !== 'test'),

  /* ---------------- PostgreSQL ---------------- */
  //
  // DATABASE_URL wins when set — hosted providers (Neon, Supabase, RDS) issue
  // a single URL and splitting it into parts drops its query options. The
  // discrete PGHOST/PGUSER/... variables are the local-development path.
  //
  // No credential has a default. A fallback password is the kind of thing that
  // quietly reaches production, so an unset value must fail to connect loudly
  // rather than silently try 'postgres'.
  DATABASE_URL: str('DATABASE_URL'),
  PGHOST: str('PGHOST', 'localhost'),
  PGPORT: int('PGPORT', 5432, { min: 1, max: 65535 }),
  PGUSER: str('PGUSER'),
  PGPASSWORD: str('PGPASSWORD'),
  PGDATABASE: str('PGDATABASE'),

  // TLS is required by every managed provider and pointless over a unix socket
  // in local development, hence off by default and on via env.
  PGSSL: bool('PGSSL', false),
  // Only disable verification for a provider using a self-signed chain, and
  // never in production: it makes the connection interceptable.
  PGSSL_REJECT_UNAUTHORIZED: bool('PGSSL_REJECT_UNAUTHORIZED', true),

  // Pool sizing. Postgres defaults to max_connections=100 shared by every
  // client, so a single app instance must not try to own them all. 10 is
  // ample for this workload; raise it only alongside the server's limit.
  PGPOOL_MAX: int('PGPOOL_MAX', 10, { min: 1, max: 100 }),
  PGPOOL_IDLE_MS: int('PGPOOL_IDLE_MS', 30_000, { min: 1000 }),
  PGPOOL_CONNECT_TIMEOUT_MS: int('PGPOOL_CONNECT_TIMEOUT_MS', 10_000, { min: 500 }),

  // Signing key for admin JWTs. Empty means "refuse to issue tokens" rather
  // than falling back to a guessable default.
  JWT_SECRET: jwtSecret,
  JWT_CONFIGURED: jwtSecret.length > 0,
  JWT_ACCESS_TTL_MIN: int('JWT_ACCESS_TTL_MIN', 30, { min: 1 }),
  JWT_REFRESH_TTL_DAYS: int('JWT_REFRESH_TTL_DAYS', 7, { min: 1 }),
  JWT_ISSUER: str('JWT_ISSUER', 'inwebtools-admin'),

  // Absolute base for links sent to users (password reset). Must be the
  // address a browser can reach, not the server's own bind address — behind a
  // proxy those differ, and a link to localhost is useless in an inbox.
  PUBLIC_APP_URL: str('PUBLIC_APP_URL', 'http://localhost:5173').replace(/\/+$/, ''),

  ADMIN_BOOTSTRAP_USERNAME: str('ADMIN_BOOTSTRAP_USERNAME', 'admin'),
  ADMIN_BOOTSTRAP_PASSWORD: str('ADMIN_BOOTSTRAP_PASSWORD'),
  ADMIN_LOGIN_MAX_ATTEMPTS: int('ADMIN_LOGIN_MAX_ATTEMPTS', 5, { min: 1 }),
  ADMIN_LOGIN_WINDOW_MS: int('ADMIN_LOGIN_WINDOW_MS', 15 * 60 * 1000, { min: 1000 }),
  // A session counts as "online now" if seen within this window.
  ADMIN_ONLINE_WINDOW_SECONDS: int('ADMIN_ONLINE_WINDOW_SECONDS', 300, { min: 10 }),

  // Geo-IP enrichment. Disabled by default: it sends visitor IPs to a third
  // party, which is a privacy decision the operator should make consciously.
  GEO_LOOKUP_ENABLED: bool('GEO_LOOKUP_ENABLED', false),
  GEO_API_URL: str('GEO_API_URL', 'http://ip-api.com/json'),
  GEO_API_TIMEOUT_MS: int('GEO_API_TIMEOUT_MS', 3000, { min: 200 }),

  SERVER_ROOT,
});

export const MAX_UPLOAD_BYTES = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;

/**
 * Minimum admin password length.
 *
 * Single source of truth: the change-password service, the create-admin script
 * and the dashboard form all read this. It previously lived in three places
 * with two different values (10 on the server, 12 in the UI), so an 11-character
 * password was blocked by the form yet accepted by the API.
 *
 * Configurable so an operator can raise it without a code change; the server
 * always enforces it regardless of what the browser allows.
 */
export const MIN_ADMIN_PASSWORD_LENGTH = int('MIN_ADMIN_PASSWORD_LENGTH', 6, { min: 1 });
