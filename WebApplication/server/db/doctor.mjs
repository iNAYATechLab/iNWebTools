#!/usr/bin/env node
/**
 * Diagnose the PostgreSQL setup.
 *
 *   npm --workspace @inwebtools/server run db:doctor
 *
 * Checks each link in the chain separately — config, TCP, auth, database,
 * schema privileges, extensions, tables — and stops at the first break with
 * the command that fixes it. A single "connection failed" cannot tell you
 * which of those actually went wrong.
 */

import net from 'node:net';

import pg from 'pg';

import { env } from '../config/env.js';

const ok = (m) => console.log(`  \x1b[32m✔\x1b[0m ${m}`);
const bad = (m, fix) => {
  console.log(`  \x1b[31m✖\x1b[0m ${m}`);
  if (fix) console.log(`    \x1b[33m→ ${fix}\x1b[0m`);
};
const info = (m) => console.log(`  \x1b[90m·\x1b[0m ${m}`);

/** Can we open a TCP socket at all? Separates "server down" from "auth failed". */
function probeTcp(host, port, timeout = 4000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

console.log('\nPostgreSQL setup check\n');

/* 1. Configuration ------------------------------------------------------- */
if (!env.DB_ENABLED) {
  bad('DB_ENABLED is false', 'Set DB_ENABLED=true in WebApplication/server/.env');
  process.exit(1);
}
ok('DB_ENABLED=true');

const usingUrl = Boolean(env.DATABASE_URL);
if (usingUrl) {
  info('Using DATABASE_URL');
} else {
  const missing = ['PGUSER', 'PGDATABASE'].filter((k) => !env[k]);
  if (missing.length) {
    bad(`Missing: ${missing.join(', ')}`, 'Fill them in WebApplication/server/.env');
    process.exit(1);
  }
  info(`Target: ${env.PGUSER}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`);

  if (env.PGHOST.startsWith('/')) {
    bad(
      `PGHOST is a unix socket (${env.PGHOST}) — this usually triggers peer authentication`,
      'Set PGHOST=localhost to connect over TCP instead',
    );
  }
}

/* 2. Is anything listening? ---------------------------------------------- */
if (!usingUrl && !env.PGHOST.startsWith('/')) {
  const reachable = await probeTcp(env.PGHOST, env.PGPORT);
  if (!reachable) {
    bad(
      `Nothing is listening on ${env.PGHOST}:${env.PGPORT}`,
      'Linux: sudo systemctl start postgresql | macOS: brew services start postgresql@17 | Windows: net start postgresql-x64-17',
    );
    process.exit(1);
  }
  ok(`Port ${env.PGPORT} is accepting connections`);
}

/* 3. Authentication and database ----------------------------------------- */
const client = new pg.Client(
  usingUrl
    ? {
        connectionString: env.DATABASE_URL,
        ssl: env.PGSSL ? { rejectUnauthorized: env.PGSSL_REJECT_UNAUTHORIZED } : false,
      }
    : {
        host: env.PGHOST,
        port: env.PGPORT,
        user: env.PGUSER,
        password: env.PGPASSWORD,
        database: env.PGDATABASE,
        ssl: env.PGSSL ? { rejectUnauthorized: env.PGSSL_REJECT_UNAUTHORIZED } : false,
        connectionTimeoutMillis: 6000,
      },
);

try {
  await client.connect();
  ok('Authenticated');
} catch (error) {
  const code = error.code;
  const fixes = {
    '28P01': `Wrong password. Reset it: ALTER ROLE ${env.PGUSER} PASSWORD '...';  then update PGPASSWORD in .env`,
    28000: 'Peer authentication. Set PGHOST=localhost in .env to use TCP.',
    '3D000': `Database missing. Run: CREATE DATABASE ${env.PGDATABASE} OWNER ${env.PGUSER};`,
    ECONNREFUSED: 'Server is not running — start the service.',
    ETIMEDOUT: "Timed out — check a firewall or the provider's IP allowlist.",
  };
  bad(error.message, fixes[code]);
  process.exit(1);
}

try {
  /* 4. Can the role write to schema public? ------------------------------ */
  const { rows: priv } = await client.query(
    "SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS can_create",
  );
  if (priv[0].can_create) {
    ok('Role can create objects in schema public');
  } else {
    bad(
      'Role cannot create objects in schema public (PostgreSQL 15+ restricts this)',
      `As a superuser: ALTER DATABASE ${env.PGDATABASE} OWNER TO ${env.PGUSER}; GRANT ALL ON SCHEMA public TO ${env.PGUSER};`,
    );
  }

  /* 5. Extensions -------------------------------------------------------- */
  const { rows: ext } = await client.query(
    "SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto','pg_trgm')",
  );
  const have = new Set(ext.map((r) => r.extname));
  for (const name of ['pgcrypto', 'pg_trgm']) {
    if (have.has(name)) ok(`Extension ${name}`);
    else
      bad(
        `Extension ${name} is missing`,
        `Run as a superuser: \\c ${env.PGDATABASE}  then  CREATE EXTENSION ${name};`,
      );
  }

  /* 6. Tables ------------------------------------------------------------ */
  const { rows: tables } = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  );
  const names = tables.map((t) => t.table_name);
  const expected = [
    'admin_audit_log',
    'users',
    'app_settings',
    'categories',
    'conversion_logs',
    'subcategories',
    'system_errors',
    'tools',
    'visitor_sessions',
  ];
  const absent = expected.filter((t) => !names.includes(t));

  if (absent.length === 0) {
    ok(`All ${expected.length} tables present`);
    const { rows: counts } = await client.query(
      'SELECT (SELECT COUNT(*) FROM tools) AS tools, (SELECT COUNT(*) FROM users) AS admins',
    );
    info(`tools: ${counts[0].tools} · users: ${counts[0].admins}`);
    if (Number(counts[0].admins) === 0) {
      bad(
        'No admin account exists — the dashboard cannot be signed into',
        'Set ADMIN_BOOTSTRAP_PASSWORD in .env and restart the server',
      );
    }
  } else {
    bad(
      `Missing tables: ${absent.join(', ')}`,
      'Run: npm --workspace @inwebtools/server run db:migrate',
    );
  }

  console.log('\nDone.\n');
} finally {
  await client.end();
}
