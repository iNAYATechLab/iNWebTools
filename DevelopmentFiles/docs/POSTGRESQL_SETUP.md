# PostgreSQL — setup and operations

The admin dashboard and the tool directory run on PostgreSQL. The public
transcription API does not need it: with the database down, `/api/admin/*`
answers 503 and everything else keeps working.

## 0. Quick start in this workspace

If you are working inside the project sandbox, one script does everything in
sections 1, 2 and 3 — install the server, create the role and database, grant
privileges, and sync the password into `server/.env`:

```bash
./DevelopmentFiles/scripts/pg-setup.sh
```

It is safe to re-run and it is the fastest way back after a fresh session,
because the workspace only persists `/home/user`: the data directory in
`/home/user/.pgdata` survives, but the PostgreSQL packages in `/usr` and
`/etc` do not. The script reinstalls them and re-points the cluster at the
data that is still there. Expect about ten seconds.

The cluster is deliberately built with `initdb --wal-segsize=1`. Stock 16 MB
WAL segments left ~145 MB of write-ahead log next to ~30 MB of real data,
which overran the snapshot budget; 1 MB segments keep the whole thing near
38 MB. That is a development trade-off — on a write-heavy production server,
use the default segment size.

The sections below describe the same steps by hand, for a server you set up
yourself.

## 1. Install the driver

```bash
# from WebApplication/
npm install pg --workspace @inwebtools/server

# yarn
yarn workspace @inwebtools/server add pg
```

Only `pg` is required. No ORM: the queries here are hand-written SQL and an
ORM would add a translation layer over SQL we already control.

## 2. Create the database and a dedicated role

Never point the app at the `postgres` superuser — a SQL-injection bug then
owns the whole cluster instead of one database.

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE inwebtools_app LOGIN PASSWORD 'a-long-random-password';
CREATE DATABASE inwebtools OWNER inwebtools_app ENCODING 'UTF8';
\c inwebtools
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy search
GRANT ALL ON SCHEMA public TO inwebtools_app;
SQL
```

## 3. Configure

Copy `server/.env.example` to `server/.env` and fill in the credentials.
Local development uses the discrete variables; a hosted provider (Neon,
Supabase, RDS) gives you a single `DATABASE_URL`, which wins when set.

```ini
DB_ENABLED=true
PGHOST=localhost
PGPORT=5432
PGUSER=inwebtools_app
PGPASSWORD=a-long-random-password
PGDATABASE=inwebtools
PGSSL=false          # true for any managed provider
PGPOOL_MAX=10
```

## 4. Apply the schema

```bash
npm --workspace @inwebtools/server run db:migrate
```

The schema is idempotent, so re-run it after every pull. The server also
applies it on boot, which means a fresh clone works with no manual step.

## 5. Verify

```bash
npm --workspace @inwebtools/server run db:doctor
```

It checks each link separately — config, port, auth, schema privileges,
extensions, tables — and stops at the first break with the command that fixes
it. A single "connection failed" cannot tell you which one broke.

```bash
curl -s localhost:5000/health | jq '.data.databaseReady'   # true
```

## Common first-run failures

| Symptom | Cause | Fix |
|---|---|---|
| `Peer authentication failed` | `psql -U user` over a unix socket ignores the password | add `-h localhost`; keep `PGHOST=localhost` in `.env` |
| `permission denied for schema public` | PostgreSQL 15+ no longer grants CREATE on `public` | `ALTER DATABASE inwebtools OWNER TO inwebtools_app;` |
| `permission denied to create extension` | role does not own the database | same as above, or have a superuser run `CREATE EXTENSION` |
| `ECONNREFUSED` | service not started | `sudo systemctl start postgresql` |
| `database "inwebtools" does not exist` | step 2 skipped | `CREATE DATABASE inwebtools OWNER inwebtools_app;` |

The server prints the same hints on startup, so a bad `.env` names its own fix
in the log rather than only the driver's message.

---

## Schema

| Table | Key | Purpose |
|---|---|---|
| `categories` | UUID | Top-level grouping |
| `subcategories` | UUID | Nested under a category |
| `tools` | UUID | The ~1,072 tools |
| `admin_users` | SERIAL | Dashboard accounts |
| `visitor_sessions` | SERIAL | "Online now" analytics |
| `conversion_logs` | SERIAL | One row per transcription |
| `system_errors` | SERIAL | Operator-visible faults |
| `app_settings` | TEXT key | Runtime settings (JSONB) |
| `admin_audit_log` | SERIAL | Privileged actions |

**Why the id types differ.** Directory content uses UUID: rows are seeded and
imported from several sources, and UUIDs let any of them generate a key
without coordinating a sequence, while keeping row counts out of public URLs.
Operational tables use SERIAL — they are internal, append-only, never appear
in a URL, and the application already stores their integer ids.

**Timestamps are `TIMESTAMPTZ` everywhere.** A bare `TIMESTAMP` stores whatever
the server's clock said and silently shifts when a deploy moves region.

## Pool sizing

`PGPOOL_MAX` is per process. PostgreSQL's default `max_connections` is 100 for
the whole cluster, so multiply by your instance count and stay well under it —
leave headroom for `psql` and backups. Raise the server's limit before raising
this.

## Gotchas carried over from SQLite

These bit us during the migration and are worth knowing before writing new SQL:

| SQLite | PostgreSQL |
|---|---|
| `is_active = 1` | `is_active = TRUE` — no implicit int/bool cast |
| `SUM(status = 'x')` | `COUNT(*) FILTER (WHERE status = 'x')` |
| `strftime('%s', a) - strftime('%s', b)` | `EXTRACT(EPOCH FROM (a - b))` |
| `datetime('now', '-6 days')` | `NOW() - INTERVAL '6 days'` |
| `GROUP BY <output alias>` | repeat the expression |
| `page_views = page_views + 1` in an upsert | qualify it: `visitor_sessions.page_views + 1` |
| JSON stored as TEXT, `JSON.parse()` on read | JSONB arrives **already parsed** — use `readJson()` |

`?` placeholders still work: the adapter rewrites them to `$1, $2` so the
existing call sites did not need editing. New code may use `$1` directly.

## Backups

```bash
pg_dump --no-owner --clean inwebtools > backup-$(date +%F).sql
psql inwebtools < backup-2026-08-25.sql
```
