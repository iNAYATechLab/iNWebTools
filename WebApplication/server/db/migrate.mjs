#!/usr/bin/env node
/**
 * Apply db/schema.sql to the configured PostgreSQL database.
 *
 * Usage (from WebApplication/):
 *   npm --workspace @inwebtools/server run db:migrate
 *
 * The schema is written to be idempotent — every object uses IF NOT EXISTS or
 * CREATE OR REPLACE — so this is safe to re-run after every pull.
 *
 * It runs inside a single transaction: PostgreSQL supports transactional DDL,
 * so a failure half-way leaves the database exactly as it was rather than
 * partially migrated.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');

  const client = new pg.Client(
    env.DATABASE_URL
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
        },
  );

  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name`,
    );

    console.log(`✔ Schema applied to "${client.database}".`);
    console.log(`  Tables: ${rows.map((r) => r.table_name).join(', ')}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('✖ Migration failed — the database was left unchanged.');
    console.error(`  ${error.message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

await main();
