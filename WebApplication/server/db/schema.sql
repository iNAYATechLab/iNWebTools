-- ===================================================================
-- iNWebTools — PostgreSQL schema
--
-- Tool directory: categories -> subcategories -> tools (~1,072 rows).
--
-- Conventions
-- -----------
-- Keys      : UUID (gen_random_uuid, from pgcrypto). A directory this size
--             will be seeded, imported and re-synced from several sources;
--             UUIDs let rows be generated anywhere without coordinating a
--             sequence, and they keep row counts out of public URLs. Where a
--             stable human-readable key matters, `slug` carries it.
-- Timestamps: TIMESTAMPTZ, always. TIMESTAMP without a zone silently stores
--             whatever the server's clock said, which breaks the moment a
--             deploy moves region. TIMESTAMPTZ normalises to UTC.
-- Deletes   : ON DELETE RESTRICT for content, so a category holding tools
--             cannot vanish by accident; CASCADE only for owned child rows.
-- Idempotent: safe to re-run — every object uses IF NOT EXISTS.
-- ===================================================================

-- Extensions are created in a DO block that tolerates a permission error.
--
-- CREATE EXTENSION requires ownership of the database (or superuser). When the
-- role lacks it, a bare statement aborts the whole migration — and because the
-- schema runs on boot, the server would refuse to start. Postgres 13+ marks
-- both of these "trusted", so the database owner can create them; for anyone
-- else we skip and let the CREATE INDEX below fail loudly instead, which names
-- the real problem.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
EXCEPTION WHEN insufficient_privilege THEN
  RAISE WARNING 'Could not create extension pgcrypto (need database ownership). Ask a superuser to run: CREATE EXTENSION pgcrypto;';
END $$;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram index for fuzzy search
EXCEPTION WHEN insufficient_privilege THEN
  RAISE WARNING 'Could not create extension pg_trgm (need database ownership). Ask a superuser to run: CREATE EXTENSION pg_trgm;';
END $$;

-- -------------------------------------------------------------------
-- Shared trigger: keep updated_at honest.
-- Doing this in the database rather than the application means a manual
-- UPDATE in psql cannot leave a stale timestamp behind.
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- categories
-- ===================================================================
CREATE TABLE IF NOT EXISTS categories (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT         NOT NULL UNIQUE,
  name         TEXT         NOT NULL,
  description  TEXT,
  icon         TEXT,
  -- Manual ordering for the navigation; ties break on name.
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Slugs appear in URLs: lower-case, digits and single hyphens only.
  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT categories_name_not_blank CHECK (length(btrim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS categories_active_order_idx
  ON categories (is_active, sort_order, name);

-- ===================================================================
-- subcategories
-- ===================================================================
CREATE TABLE IF NOT EXISTS subcategories (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID         NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  slug         TEXT         NOT NULL,
  name         TEXT         NOT NULL,
  description  TEXT,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Unique per parent, not globally: /pdf/convert and /image/convert are both
  -- legitimate.
  CONSTRAINT subcategories_slug_unique UNIQUE (category_id, slug),
  CONSTRAINT subcategories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT subcategories_name_not_blank CHECK (length(btrim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS subcategories_category_idx
  ON subcategories (category_id, sort_order, name);

-- ===================================================================
-- tools  (~1,072 rows)
-- ===================================================================
CREATE TABLE IF NOT EXISTS tools (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Every tool belongs to a category. The subcategory is optional so a tool
  -- can sit directly under a category, hence NULL + ON DELETE SET NULL.
  category_id     UUID         NOT NULL REFERENCES categories (id)    ON DELETE RESTRICT,
  subcategory_id  UUID         REFERENCES subcategories (id)          ON DELETE SET NULL,

  slug            TEXT         NOT NULL UNIQUE,
  name            TEXT         NOT NULL,
  tagline         TEXT,
  description     TEXT,

  -- Where the tool lives. Internal route (/tools/json-formatter) or an
  -- external URL.
  route           TEXT,
  external_url    TEXT,
  icon            TEXT,

  -- Free-form labels for filtering. A native array avoids a join table for
  -- what is only ever read as a whole; GIN below keeps `tags @> ARRAY[...]`
  -- fast.
  tags            TEXT[]       NOT NULL DEFAULT '{}',

  status          TEXT         NOT NULL DEFAULT 'draft',
  is_featured     BOOLEAN      NOT NULL DEFAULT FALSE,
  is_premium      BOOLEAN      NOT NULL DEFAULT FALSE,

  -- Denormalised counter. Kept here rather than derived from an events table
  -- because "most used tools" is read on every page load and recomputing it
  -- from millions of rows would not scale.
  usage_count     BIGINT       NOT NULL DEFAULT 0,

  sort_order      INTEGER      NOT NULL DEFAULT 0,

  -- Arbitrary per-tool settings that do not deserve columns. JSONB (not JSON)
  -- so it is stored parsed and can be indexed.
  metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,

  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMPTZ,

  CONSTRAINT tools_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT tools_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT tools_status_valid CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT tools_usage_count_positive CHECK (usage_count >= 0),

  -- A tool must be reachable somehow, and must not claim two destinations.
  CONSTRAINT tools_one_destination CHECK (
    (route IS NOT NULL AND external_url IS NULL) OR
    (route IS NULL AND external_url IS NOT NULL)
  ),

  -- Published means published: no half-filled rows on the public site.
  CONSTRAINT tools_published_needs_date CHECK (
    status <> 'published' OR published_at IS NOT NULL
  )
);

-- The listing query: published tools in one category, ordered.
CREATE INDEX IF NOT EXISTS tools_category_status_idx
  ON tools (category_id, status, sort_order, name);

CREATE INDEX IF NOT EXISTS tools_subcategory_idx
  ON tools (subcategory_id)
  WHERE subcategory_id IS NOT NULL;

-- Partial index: the public site only ever lists published rows, so the index
-- covers those and stays small.
CREATE INDEX IF NOT EXISTS tools_published_idx
  ON tools (published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS tools_featured_idx
  ON tools (sort_order)
  WHERE is_featured = TRUE AND status = 'published';

CREATE INDEX IF NOT EXISTS tools_popular_idx
  ON tools (usage_count DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS tools_tags_idx ON tools USING GIN (tags);
CREATE INDEX IF NOT EXISTS tools_metadata_idx ON tools USING GIN (metadata);

-- Search across name + tagline + description. GIN over to_tsvector handles
-- word search; the trigram index handles partial and misspelled input, which
-- to_tsvector cannot.
CREATE INDEX IF NOT EXISTS tools_search_idx
  ON tools USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(tagline, '') || ' ' || COALESCE(description, ''))
  );

CREATE INDEX IF NOT EXISTS tools_name_trgm_idx
  ON tools USING GIN (name gin_trgm_ops);

-- -------------------------------------------------------------------
-- updated_at triggers
-- -------------------------------------------------------------------
DROP TRIGGER IF EXISTS categories_set_updated_at ON categories;
CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS subcategories_set_updated_at ON subcategories;
CREATE TRIGGER subcategories_set_updated_at
  BEFORE UPDATE ON subcategories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS tools_set_updated_at ON tools;
CREATE TRIGGER tools_set_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------------------
-- Convenience view: a tool with its category and subcategory names, so the
-- common listing query does not repeat the joins.
-- -------------------------------------------------------------------
CREATE OR REPLACE VIEW tools_expanded AS
SELECT
  t.id,
  t.slug,
  t.name,
  t.tagline,
  t.description,
  t.route,
  t.external_url,
  t.icon,
  t.tags,
  t.status,
  t.is_featured,
  t.is_premium,
  t.usage_count,
  t.sort_order,
  t.metadata,
  t.created_at,
  t.updated_at,
  t.published_at,
  c.id   AS category_id,
  c.slug AS category_slug,
  c.name AS category_name,
  s.id   AS subcategory_id,
  s.slug AS subcategory_slug,
  s.name AS subcategory_name
FROM tools t
JOIN categories c    ON c.id = t.category_id
LEFT JOIN subcategories s ON s.id = t.subcategory_id;

-- ===================================================================
-- Admin dashboard tables
--
-- Ported from the previous SQLite schema. These use SERIAL rather than UUID:
-- they are internal, append-only operational records that are never exposed in
-- a public URL, and the application already stores their integer ids (session
-- lookups, error resolution). Switching them to UUID would be churn with no
-- benefit, so the id type follows the use, not a blanket rule.
--
-- SQLite -> PostgreSQL conversions applied:
--   INTEGER PRIMARY KEY AUTOINCREMENT -> SERIAL PRIMARY KEY
--   INTEGER 0/1 for booleans          -> BOOLEAN
--   TEXT timestamps                   -> TIMESTAMPTZ
--   AFTER UPDATE triggers             -> the shared set_updated_at() trigger
-- ===================================================================

-- One accounts table for everyone: the public sign-up and the dashboard
-- operators differ by role, not by table. Two tables would mean two login
-- endpoints, two password policies and two places to revoke an account.
--
-- Migrated from the earlier admin-only design. The rename and the role
-- remapping below run before CREATE TABLE so an existing deployment upgrades
-- in place instead of ending up with two tables.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users')
  THEN
    ALTER TABLE admin_users RENAME TO users;
    -- The old CHECK still names the old roles; drop it before remapping.
    ALTER TABLE users DROP CONSTRAINT IF EXISTS admin_users_role_check;
    UPDATE users SET role = 'super_admin' WHERE role = 'owner';
    UPDATE users SET role = 'user'        WHERE role = 'viewer';
    RAISE NOTICE 'Renamed admin_users to users and remapped roles.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL       PRIMARY KEY,
  username       TEXT         NOT NULL UNIQUE,
  -- Nullable: accounts created before self-registration have no email, and
  -- forcing a placeholder would break the UNIQUE index. Required for new
  -- sign-ups at the application layer.
  email          TEXT         UNIQUE,
  password_hash  TEXT         NOT NULL,
  full_name      TEXT,
  role           TEXT         NOT NULL DEFAULT 'user'
                              CHECK (role IN ('user', 'admin', 'super_admin')),
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Columns added by this version, for databases that already had the table.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('user', 'admin', 'super_admin'));
  END IF;
END $$;

-- Case-insensitive lookup: sign-in accepts either identifier, and "Admin"
-- must not be able to register alongside "admin".
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx    ON users (LOWER(email))
  WHERE email IS NOT NULL;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Password reset tokens.
--
-- Only the SHA-256 hash is stored. A leaked database backup then yields no
-- usable reset links, the same reasoning that applies to passwords.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL       PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT         NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens (user_id) WHERE used_at IS NULL;

-- One row per visitor session; last_seen_at drives the "online now" view.
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id             SERIAL       PRIMARY KEY,
  session_id     TEXT         NOT NULL UNIQUE,
  ip_address     TEXT         NOT NULL,
  user_agent     TEXT,
  device_type    TEXT,
  browser        TEXT,
  os             TEXT,
  country        TEXT,
  country_code   TEXT,
  city           TEXT,
  isp            TEXT,
  geo_status     TEXT         NOT NULL DEFAULT 'pending'
                              CHECK (geo_status IN ('pending', 'ok', 'failed', 'skipped')),
  page_views     INTEGER      NOT NULL DEFAULT 1,
  first_seen_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_seen_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS visitor_sessions_last_seen_idx  ON visitor_sessions (last_seen_at);
CREATE INDEX IF NOT EXISTS visitor_sessions_geo_status_idx ON visitor_sessions (geo_status);

-- One row per /api/transcribe call, successful or not.
CREATE TABLE IF NOT EXISTS conversion_logs (
  id                SERIAL       PRIMARY KEY,
  request_id        TEXT         NOT NULL,
  session_id        TEXT,
  ip_address        TEXT,
  country_code      TEXT,
  file_name         TEXT,
  file_size_bytes   BIGINT,
  file_format       TEXT,
  language          TEXT,
  model             TEXT,
  status            TEXT         NOT NULL CHECK (status IN ('success', 'failed')),
  error_code        TEXT,
  characters        INTEGER,
  words             INTEGER,
  duration_ms       INTEGER,
  transcript_sample TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversion_logs_created_idx ON conversion_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS conversion_logs_status_idx  ON conversion_logs (status);
CREATE INDEX IF NOT EXISTS conversion_logs_request_idx ON conversion_logs (request_id);

CREATE TABLE IF NOT EXISTS system_errors (
  id           SERIAL       PRIMARY KEY,
  request_id   TEXT,
  level        TEXT         NOT NULL DEFAULT 'error'
                            CHECK (level IN ('warn', 'error', 'fatal')),
  code         TEXT         NOT NULL,
  message      TEXT         NOT NULL,
  http_status  INTEGER,
  route        TEXT,
  method       TEXT,
  ip_address   TEXT,
  stack        TEXT,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_errors_created_idx  ON system_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS system_errors_level_idx    ON system_errors (level);
-- Partial: the dashboard's default filter is "unresolved only".
CREATE INDEX IF NOT EXISTS system_errors_unresolved_idx
  ON system_errors (created_at DESC) WHERE resolved_at IS NULL;

-- Runtime-editable settings. Values are JSONB so a setting can grow from a
-- scalar to an object without a migration.
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key   TEXT         PRIMARY KEY,
  setting_value JSONB        NOT NULL,
  updated_by    TEXT,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS app_settings_set_updated_at ON app_settings;
CREATE TRIGGER app_settings_set_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          SERIAL       PRIMARY KEY,
  username    TEXT,
  action      TEXT         NOT NULL,
  detail      TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_action_idx  ON admin_audit_log (action);
