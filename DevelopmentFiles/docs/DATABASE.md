# Database

> **⚠️ Status — SQLite removed (2026-08-25)**
>
> The SQLite engine has been removed ahead of a migration to PostgreSQL. No
> database is configured: `DB_ENABLED=false`, `/api/admin/*` answers 503
> `DATABASE_UNAVAILABLE`, and the public transcription API is unaffected.
> This document describes the *previous* SQLite setup and is kept for
> reference until the PostgreSQL schema replaces it.
>
> Archived artefacts: `DevelopmentFiles/backups/sqlite-archive-20260825/`

iNWebTools stores admin-dashboard data in **SQLite**.

> **SQLite is a file, not a server.**
> There is no daemon to start, no port to open, no username or password. The
> whole database is a single file on disk that the API server opens directly.
> There is nothing to "visit" in a browser — to see the data, open the admin
> dashboard at `/AdminDashboard`, or use the `sqlite3` CLI.

---

## At a glance

| | |
|---|---|
| Engine | SQLite 3 (via `better-sqlite3`) |
| File | `WebApplication/server/data/inwebtools.db` |
| Port | **none** — embedded, in-process |
| Credentials | **none** — filesystem permissions are the access control |
| Configured by | `DB_ENABLED`, `DB_FILE` in `server/.env` |
| Backup | `cp data/inwebtools.db backup.db` |
| Committed to Git? | **No.** Gitignored — it holds password hashes and visitor IPs |

Because the engine is embedded, the "is the database running?" question has no
meaning: if the API server is running, so is the database.

---

## Why SQLite

The dashboard is a single-writer, low-volume workload: a handful of rows per
transcription and one operator reading them. That profile does not need a
separate database server, and running one costs real complexity — a daemon to
supervise, a port that can collide, credentials to rotate, a dump/restore
procedure for backups.

SQLite removes all of it. It is also the most-deployed database engine in the
world and is fully ACID, so this is a simplification, not a compromise.

The trade-off to know: SQLite allows **one writer at a time**. WAL mode (enabled
at boot) lets readers work during a write, and `busy_timeout=5000` makes a
blocked writer wait rather than fail. At this project's volume that ceiling is
far away. An application that needed many concurrent writers — or a database
shared by several servers — would want PostgreSQL instead.

---

## Where the data lives

```
WebApplication/server/data/
├── inwebtools.db        ← the database
├── inwebtools.db-wal    ← write-ahead log (appears while running)
└── inwebtools.db-shm    ← shared-memory index (appears while running)
```

The `-wal` and `-shm` files are normal companions of WAL mode. They are managed
by SQLite and disappear on a clean shutdown. **When copying the database, copy
all three** — or, better, stop the server first, or use `sqlite3 ... ".backup"`,
which is safe on a live database:

```bash
cd WebApplication/server
sqlite3 data/inwebtools.db ".backup 'backup-$(date +%F).db'"
```

The directory is created automatically at boot and is gitignored.

---

## How the app reaches it

```
browser  ──►  Vite :5173  ──►  Express :5000  ──►  data/inwebtools.db
              (dev proxy)      (API server)        (a file, opened in-process)
```

No network hop for the database: `better-sqlite3` is a C library compiled into
the Node process, so a query is a function call rather than a round trip over a
socket. That is also why the driver is synchronous — there is no I/O to await.
`db/index.js` still exposes `async` helpers so call sites read the same as they
did under the old MySQL driver.

---

## Configuration

```ini
# server/.env
DB_ENABLED=true
DB_FILE=data/inwebtools.db
```

- `DB_ENABLED=false` → the transcription API keeps working and every
  `/api/admin/*` route answers `503 DATABASE_UNAVAILABLE`. The dashboard is an
  add-on and must never be able to take the API down.
- `DB_FILE` → relative paths resolve against `WebApplication/server`, so the
  value does not depend on the directory the process was started from. Absolute
  paths are used as-is.
- Under `NODE_ENV=test` an in-memory database is always used, so tests never
  touch a real file and never leak state between runs.

---

## Inspecting the data

**1. The admin dashboard** — `http://localhost:5173/AdminDashboard`. The
intended route for day-to-day use.

**2. The `sqlite3` CLI:**

```bash
cd WebApplication/server
sqlite3 data/inwebtools.db

sqlite> .tables
sqlite> .schema conversion_logs
sqlite> .headers on
sqlite> .mode column
sqlite> SELECT status, COUNT(*) FROM conversion_logs GROUP BY status;
sqlite> .quit
```

**3. A GUI** — [DB Browser for SQLite](https://sqlitebrowser.org/) or the
SQLite extension for VS Code. Point it at the `.db` file.

**4. From Node:**

```js
import { query } from './db/index.js';
const rows = await query('SELECT COUNT(*) AS n FROM visitor_sessions');
```

---

## Schema

Six tables, defined in `server/db/schema.sql` and applied automatically at boot.
Every statement is `IF NOT EXISTS`, so starting the server twice is harmless.

| Table | Holds |
|---|---|
| `admin_users` | Dashboard accounts. Passwords are bcrypt hashes (cost 12), never plaintext |
| `visitor_sessions` | One row per visitor session; `last_seen_at` drives the "online now" view |
| `conversion_logs` | One row per `/api/transcribe` call, successful or not |
| `system_errors` | Backend faults worth showing an operator |
| `app_settings` | Runtime-editable settings (upload limits, global notice) as JSON strings |
| `admin_audit_log` | Admin logins and privileged actions |

Privacy: `conversion_logs.transcript_sample` stores at most 280 characters as a
preview. **Full transcripts are never written to the database.**

### SQLite-specific notes

- **No `DATETIME` type.** Timestamps are TEXT in `'YYYY-MM-DD HH:MM:SS'` UTC.
  `db/index.js` converts the known timestamp columns back to `Date` objects on
  read, so the API keeps emitting ISO-8601 exactly as it did under MySQL.
- **No `ENUM`.** Replaced by `TEXT` + `CHECK (col IN (...))`, which enforces the
  same constraint.
- **No `ON UPDATE CURRENT_TIMESTAMP`.** Replaced by `AFTER UPDATE` triggers on
  `admin_users` and `app_settings`.
- **Booleans are `INTEGER` 0/1**, with a `CHECK` constraint.
- `CHECK` constraints are enforced by default; **foreign keys are not** —
  `PRAGMA foreign_keys = ON` is set at boot.

---

## Troubleshooting

**`databaseReady: false` in `/health`**
Read the server log line beginning `Database unavailable`. Usual causes: the
process cannot create `data/` (permissions), or `DB_FILE` points somewhere
unwritable.

**`SQLITE_BUSY: database is locked`**
Another process holds the write lock — commonly a second server instance, or an
open `sqlite3` session mid-transaction. Close it. `busy_timeout` already waits
5 seconds before giving up.

**`SQLITE_CANTOPEN`**
The parent directory does not exist and could not be created. Check `DB_FILE`
and the permissions on `WebApplication/server`.

**Reset the database**
Stop the server, delete the file, restart — the schema is recreated and the
bootstrap admin is seeded from `ADMIN_BOOTSTRAP_PASSWORD`:

```bash
rm WebApplication/server/data/inwebtools.db*
```

**`CHECK constraint failed`**
A write tried to use a value outside the allowed set — e.g. a `status` other
than `success`/`failed`. The constraint is doing its job; fix the caller.

---

## History: migrated from MySQL

The project originally used MySQL/MariaDB on port 3306. It was replaced by
SQLite to remove the separate database server. The migration:

- `mysql2` → `better-sqlite3`
- `AUTO_INCREMENT` → `INTEGER PRIMARY KEY AUTOINCREMENT`
- `ENUM(...)` → `TEXT` + `CHECK`
- `ON UPDATE CURRENT_TIMESTAMP` → `AFTER UPDATE` triggers
- `NOW()`, `CURDATE()`, `INTERVAL n UNIT` → `datetime('now', '-n units')`
- `TIMESTAMPDIFF(SECOND, a, b)` → `strftime('%s', b) - strftime('%s', a)`
- `DATE_FORMAT(x, '%Y-%m-%d %H:00')` → `strftime('%Y-%m-%d %H:00', x)`
- `INSERT ... ON DUPLICATE KEY UPDATE` → `INSERT ... ON CONFLICT DO UPDATE`
- `INSERT IGNORE` → `INSERT OR IGNORE`
- `DB_HOST/PORT/USER/PASSWORD/NAME/POOL_SIZE` → a single `DB_FILE`

Existing rows were carried across by
`DevelopmentFiles/scripts/migrate-mysql-to-sqlite.mjs`, which loads TSV dumps
taken from the old server. It is kept for reference and is not needed on a
live server.

বাংলা নির্দেশিকা: [`SQLITE_GUIDE_BN.md`](./SQLITE_GUIDE_BN.md) — how to inspect the database without knowing SQL.

See [`PORTS.md`](./PORTS.md) — the database no longer occupies a port at all.
