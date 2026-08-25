/**
 * PostgreSQL connection layer.
 *
 * Exposes the same contract the rest of the server already imports, so no
 * consumer changed when the engine did:
 *
 *   isReady()          -> boolean
 *   query(sql, params) -> rows on read, { affectedRows, insertId } on write
 *   queryOne(sql, p)   -> first row or null
 *   initDatabase()     -> connect + migrate; never throws
 *   closeDatabase()    -> drain the pool
 *
 * Design notes
 * ------------
 * Pooling: `pg.Pool` hands out and reuses connections. A new TCP connection +
 * TLS handshake + auth per query would dominate the cost of every request, and
 * an unbounded number of them would exhaust the server's `max_connections`.
 * The pool caps concurrency and queues the rest.
 *
 * Fail-soft: the dashboard is an add-on. A database outage must never take the
 * transcription API down, so `initDatabase()` logs and swallows instead of
 * throwing, and `isReady()` tells the admin routes to answer 503.
 *
 * Placeholder translation: `pg` speaks `$1, $2`, while the existing 33 call
 * sites were written for `?`. `toPgPlaceholders()` rewrites them, so the SQL
 * already in the codebase keeps working. New code may use `$1` directly —
 * a statement containing `$1` is passed through untouched.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcryptjs';
import pg from 'pg';

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool, types } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Type parsing
 * ------------------------------------------------------------------ */

// node-postgres returns BIGINT (int8) as a string because a 64-bit integer can
// exceed Number.MAX_SAFE_INTEGER. Every bigint we select is a COUNT(*) or an
// id well inside the safe range, and the API contract says these are numbers,
// so parse them. Revisit if a counter ever approaches 2^53.
types.setTypeParser(types.builtins.INT8, (value) => Number.parseInt(value, 10));

// NUMERIC likewise arrives as a string to preserve exact precision.
types.setTypeParser(types.builtins.NUMERIC, (value) => Number.parseFloat(value));

/* ------------------------------------------------------------------ *
 * Module state
 * ------------------------------------------------------------------ */

/** @type {import('pg').Pool | null} */
let pool = null;
let ready = false;
let lastError = null;

/** True once the pool is connected and the schema is applied. */
export const isReady = () => ready;

/** Last connection/bootstrap error, surfaced by /health. */
export const getLastError = () => lastError;

/** The raw pool, for tests and maintenance tasks. */
export const getHandle = () => pool;

/* ------------------------------------------------------------------ *
 * SQL helpers
 * ------------------------------------------------------------------ */

/**
 * Rewrite `?` placeholders to PostgreSQL's `$1, $2, …`.
 *
 * Quoted text is skipped so a literal question mark inside a string — say
 * `WHERE label = 'why?'` — is not mistaken for a parameter. Handles single
 * quotes (with the SQL '' escape), double-quoted identifiers, and dollar-quoted
 * bodies.
 *
 * @param {string} sql
 * @returns {string}
 */
export function toPgPlaceholders(sql) {
  // Already written for pg — leave it alone.
  if (/\$\d/.test(sql)) return sql;
  if (!sql.includes('?')) return sql;

  let out = '';
  let index = 0;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    if (ch === "'" || ch === '"') {
      // Copy the quoted run verbatim, honouring the doubled-quote escape.
      const quote = ch;
      out += ch;
      i += 1;
      while (i < sql.length) {
        out += sql[i];
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            out += sql[i + 1];
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (ch === '?') {
      index += 1;
      out += `$${index}`;
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

/**
 * Read a JSONB column.
 *
 * `pg` parses JSON and JSONB for you, so a JSONB column arrives as a live
 * object — calling JSON.parse() on it throws. The previous engine stored these
 * as TEXT and every caller parsed manually, so this accepts both and lets the
 * same code work against either shape.
 *
 * @param {unknown} value
 * @param {unknown} [fallback]
 */
export function readJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Statements that return rows rather than a row count. */
const RETURNS_ROWS = /^\s*(SELECT|WITH|SHOW|EXPLAIN|VALUES|TABLE)\b/i;

/* ------------------------------------------------------------------ *
 * Query API
 * ------------------------------------------------------------------ */

/**
 * Run a parameterised statement.
 *
 * Values are always bound, never interpolated — the driver sends them
 * separately from the SQL text, so a value can never be parsed as SQL.
 *
 * @param {string} sql
 * @param {unknown[]} [params]
 * @returns {Promise<any>} rows for reads; `{ affectedRows, insertId }` for writes
 */
export async function query(sql, params = []) {
  if (!pool) {
    throw new Error('Database is not connected.');
  }

  const text = toPgPlaceholders(sql);
  const started = Date.now();

  try {
    const result = await pool.query(text, params);

    const elapsed = Date.now() - started;
    if (elapsed > 200) {
      logger.warn('Slow query', { ms: elapsed, sql: text.slice(0, 120) });
    }

    if (RETURNS_ROWS.test(text)) return result.rows;

    // Writes: mirror the shape the callers were built against. `insertId` is
    // only populated when the statement asked for it via RETURNING id.
    return {
      affectedRows: result.rowCount ?? 0,
      insertId: result.rows?.[0]?.id ?? null,
      rows: result.rows ?? [],
    };
  } catch (error) {
    // Log the statement but never the parameters: they carry password hashes,
    // tokens and visitor IPs.
    logger.error('Query failed', { sql: text.slice(0, 200), error: error.message });
    throw error;
  }
}

/**
 * First row of a read, or null.
 * @param {string} sql
 * @param {unknown[]} [params]
 */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  if (Array.isArray(rows)) return rows[0] ?? null;
  return rows?.rows?.[0] ?? null;
}

/**
 * Run several statements atomically.
 *
 * The callback receives a dedicated client — every statement inside must use
 * it, or it will run outside the transaction on a different connection.
 *
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  if (!pool) throw new Error('Database is not connected.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {
      // The rollback itself can fail if the connection dropped; the original
      // error is the useful one, so keep it.
    });
    throw error;
  } finally {
    // Always return the connection, success or failure — otherwise the pool
    // leaks and eventually every request hangs waiting for a free client.
    client.release();
  }
}

/**
 * Map a connection failure to the fix.
 *
 * These are the errors a first-time setup actually hits; the driver's own
 * message describes the symptom and leaves the operator guessing.
 *
 * @param {Error & { code?: string }} error
 * @returns {string | null}
 */
function connectionHint(error) {
  const message = String(error?.message ?? '');
  const code = error?.code;

  if (code === 'ECONNREFUSED') {
    return 'Is the server running? Linux: sudo systemctl start postgresql — macOS: brew services start postgresql@17';
  }
  if (code === '28P01' || /password authentication failed/i.test(message)) {
    return "PGPASSWORD in server/.env does not match the role. Reset it: ALTER ROLE <user> PASSWORD '...';";
  }
  if (code === '28000' || /peer authentication/i.test(message)) {
    return 'Peer auth is being used. Set PGHOST=localhost (or 127.0.0.1) to force a TCP connection.';
  }
  if (code === '3D000' || /database .* does not exist/i.test(message)) {
    return 'Create it: CREATE DATABASE inwebtools OWNER <user>;';
  }
  if (code === '42501' || /permission denied for schema/i.test(message)) {
    return 'The role cannot write to schema public (PostgreSQL 15+). Run: ALTER DATABASE <db> OWNER TO <user>; GRANT ALL ON SCHEMA public TO <user>;';
  }
  if (code === 'ENOTFOUND') {
    return 'PGHOST could not be resolved — check the hostname in server/.env.';
  }
  if (code === 'ETIMEDOUT') {
    return "Connection timed out — check a firewall, or the provider's IP allowlist.";
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Schema + seed
 * ------------------------------------------------------------------ */

/**
 * Apply db/schema.sql.
 *
 * The schema is idempotent, so running it on every boot keeps a fresh clone or
 * a new environment working with no extra step. PostgreSQL has transactional
 * DDL, so a failure rolls back rather than leaving a half-built schema.
 */
async function applySchema() {
  const file = path.join(__dirname, 'schema.sql');
  const sql = await fs.readFile(file, 'utf8');
  await pool.query(sql);
}

/**
 * Insert default settings and the first admin, never overwriting live values.
 *
 * Without this a fresh database has no way in: every login fails and the
 * dashboard is unreachable.
 */
async function seed() {
  const defaults = [
    ['upload_limits', JSON.stringify({ maxUploadSizeMb: env.MAX_UPLOAD_SIZE_MB })],
    [
      'global_notice',
      JSON.stringify({ enabled: false, message: '', messageBn: '', variant: 'info' }),
    ],
  ];

  for (const [key, value] of defaults) {
    // PostgreSQL's spelling of INSERT IGNORE.
    await query(
      'INSERT INTO app_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO NOTHING',
      [key, value],
    );
  }

  const row = await queryOne('SELECT COUNT(*) AS n FROM users');
  if (Number(row?.n ?? 0) > 0) return;

  // Bootstrap the first super_admin from the environment. Without a password the
  // table stays empty and every login fails closed, which is the safe default.
  if (!env.ADMIN_BOOTSTRAP_PASSWORD) {
    logger.warn(
      'No admin user exists and ADMIN_BOOTSTRAP_PASSWORD is unset — the dashboard cannot be signed into yet.',
    );
    return;
  }

  const hash = await bcrypt.hash(env.ADMIN_BOOTSTRAP_PASSWORD, 12);
  await query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', [
    env.ADMIN_BOOTSTRAP_USERNAME,
    hash,
    'super_admin',
  ]);
  logger.info('Bootstrapped the initial admin account', {
    username: env.ADMIN_BOOTSTRAP_USERNAME,
  });
}

/* ------------------------------------------------------------------ *
 * Lifecycle
 * ------------------------------------------------------------------ */

/**
 * Create the pool and verify it.
 *
 * Never throws: a database outage disables the dashboard but must not stop the
 * server from booting.
 *
 * @returns {Promise<boolean>} whether the database is usable
 */
export async function initDatabase() {
  if (!env.DB_ENABLED) {
    logger.info('[db] DB_ENABLED=false — admin dashboard disabled by configuration.');
    return false;
  }

  try {
    pool = new Pool({
      // A connection string wins when supplied: hosted providers (Neon, Supabase,
      // RDS) hand out a URL, and splitting it into parts loses query options.
      ...(env.DATABASE_URL
        ? { connectionString: env.DATABASE_URL }
        : {
            host: env.PGHOST,
            port: env.PGPORT,
            user: env.PGUSER,
            password: env.PGPASSWORD,
            database: env.PGDATABASE,
          }),

      ssl: env.PGSSL ? { rejectUnauthorized: env.PGSSL_REJECT_UNAUTHORIZED } : false,

      max: env.PGPOOL_MAX,
      idleTimeoutMillis: env.PGPOOL_IDLE_MS,
      connectionTimeoutMillis: env.PGPOOL_CONNECT_TIMEOUT_MS,
      application_name: env.PROJECT_NAME,
    });

    // An idle client can be killed by the server or a network device. Without a
    // handler this surfaces as an unhandled 'error' event and takes the process
    // down — the pool discards the client on its own, so logging is enough.
    pool.on('error', (error) => {
      lastError = error.message;
      logger.error('[db] Idle client error', { error: error.message });
    });

    const probe = await pool.query('SELECT current_database() AS db, version() AS version');
    ready = true;
    lastError = null;

    // Order matters: the schema must exist before anything is seeded into it.
    await applySchema();
    await seed();

    logger.info('[db] PostgreSQL connected', {
      database: probe.rows[0].db,
      version: String(probe.rows[0].version).split(' ').slice(0, 2).join(' '),
      poolMax: env.PGPOOL_MAX,
    });

    return true;
  } catch (error) {
    ready = false;
    lastError = error.message;
    pool = null;

    // Translate the three failures that account for almost every bad first
    // run into the command that fixes them. The raw driver message names the
    // symptom, not the cause.
    const hint = connectionHint(error);
    logger.error('[db] PostgreSQL unavailable — admin dashboard will answer 503', {
      error: error.message,
      ...(hint ? { hint } : {}),
    });
    return false;
  }
}

/** Drain the pool on shutdown so in-flight queries finish first. */
export async function closeDatabase() {
  if (!pool) return;
  try {
    await pool.end();
  } catch (error) {
    logger.warn('[db] Error while closing the pool', { error: error.message });
  } finally {
    pool = null;
    ready = false;
  }
}
