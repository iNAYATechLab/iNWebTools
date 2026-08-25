#!/usr/bin/env bash
#
# Bring PostgreSQL up in this workspace.
#
#   ./DevelopmentFiles/scripts/pg-setup.sh
#
# Safe to re-run: every step checks before acting.
#
# Why this exists
# ---------------
# Workspace snapshots only capture /home/user. PostgreSQL installs its binaries
# in /usr/lib/postgresql and its config in /etc/postgresql, so after a fresh
# session the package is gone even though the data is not. This script
# reinstalls the server if needed and re-points it at the data directory that
# did survive, in /home/user/.pgdata.
#
# The data directory is deliberately outside the repo: it holds password
# hashes and is ~32 MB of binary files that must never be committed.

set -euo pipefail

PGVER=17
PGDATA=/home/user/.pgdata/main
CONF=/etc/postgresql/${PGVER}/main/postgresql.conf
PASSFILE=/home/user/.inwebtools_pgpass
DBNAME=inwebtools
DBUSER=inwebtools_app

ok()   { printf '  \033[32m✔\033[0m %s\n' "$1"; }
info() { printf '  \033[90m·\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }

echo
echo "PostgreSQL workspace setup"
echo

# ---------------------------------------------------------------- install ---
# Test for the server binary, not for psql. Debian's postgresql-common leaves
# /usr/bin/psql behind as a wrapper symlink even after the server is purged, so
# `command -v psql` reports success on a machine that cannot run a database.
if [ -x "/usr/lib/postgresql/${PGVER}/bin/postgres" ]; then
  ok "PostgreSQL ${PGVER} already installed"
else
  info "Installing postgresql-${PGVER} (this takes a minute)…"
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq >/dev/null 2>&1 || true
  if ! sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
       postgresql postgresql-contrib >/tmp/pg-install.log 2>&1; then
    warn "Install failed — see /tmp/pg-install.log"
    tail -5 /tmp/pg-install.log
    exit 1
  fi
  ok "Installed PostgreSQL ${PGVER}"

  # A fresh install creates its own empty cluster. Ours is the one that
  # survived in /home/user, so drop the new one before re-pointing the config.
  if [ -d "$PGDATA" ] && [ -d "/var/lib/postgresql/${PGVER}/main" ]; then
    sudo pg_ctlcluster ${PGVER} main stop 2>/dev/null || true
    sudo rm -rf "/var/lib/postgresql/${PGVER}/main"
    info "Removed the empty cluster created by the installer"
  fi
fi

# ------------------------------------------------------------ data directory -
if [ -d "$PGDATA" ]; then
  ok "Data directory found: $PGDATA"
  # The reinstall creates a pristine cluster; ours is the one that persisted.
  sudo chown -R postgres:postgres /home/user/.pgdata
  sudo chmod 700 "$PGDATA"
  # postgres must be able to traverse /home/user to reach it.
  sudo chmod o+x /home/user
else
  info "No data directory yet — creating one at $PGDATA"
  # --wal-segsize=1 is the reason this is initdb rather than the stock cluster.
  # Default 16 MB segments meant ~145 MB of WAL for ~30 MB of data, which blew
  # past the snapshot budget. 1 MB segments bring the whole cluster to ~38 MB.
  sudo mkdir -p /home/user/.pgdata
  sudo chown postgres:postgres /home/user/.pgdata
  # postgres needs to traverse /home/user *before* initdb runs, not after:
  # without this the directory it is asked to populate is unreachable and it
  # fails immediately.
  sudo chmod o+x /home/user
  # Keep the log. This used to redirect to /dev/null, so when initdb failed the
  # script died under `set -e` having printed only "creating one at …" — no
  # error, no hint, and the next run repeated the same silent stop.
  if ! sudo -u postgres /usr/lib/postgresql/${PGVER}/bin/initdb \
       -D "$PGDATA" --wal-segsize=1 --encoding=UTF8 --locale=C.UTF-8 \
       >/tmp/pg-initdb.log 2>&1; then
    warn "initdb failed — last lines of /tmp/pg-initdb.log:"
    tail -12 /tmp/pg-initdb.log
    exit 1
  fi
  ok "Initialised a fresh cluster with 1 MB WAL segments"
  NEEDS_RESTORE=1
fi
sudo chmod 700 "$PGDATA"
sudo chmod o+x /home/user

# ------------------------------------------------------------------ config ---
if [ -f "$CONF" ] && ! grep -q "^data_directory = '$PGDATA'" "$CONF"; then
  sudo sed -i "s|^data_directory = .*|data_directory = '$PGDATA'|" "$CONF"
  ok "Pointed the cluster at $PGDATA"
fi

# Keep WAL small: snapshots are capped around 128 MB and stock settings
# preallocate ~145 MB of WAL for what is only ~30 MB of data.
if [ -f "$CONF" ] && ! grep -q 'Workspace tuning' "$CONF"; then
  sudo tee -a "$CONF" >/dev/null <<'EOF'

# --- Workspace tuning -------------------------------------------------
min_wal_size = 16MB
max_wal_size = 64MB
wal_keep_size = 0
EOF
  ok "Applied WAL size limits"
fi

# ------------------------------------------------------------------- start ---
if sudo pg_lsclusters 2>/dev/null | grep -q "^${PGVER}  *main.*online"; then
  ok "Server already running"
else
  sudo pg_ctlcluster ${PGVER} main start
  sleep 2
  ok "Server started on port 5432"
fi

# -------------------------------------------------------- role and database --
if [ ! -f "$PASSFILE" ]; then
  umask 077
  openssl rand -base64 24 | tr -d '\n' > "$PASSFILE"
  ok "Generated a new database password ($PASSFILE)"
fi
PGPASS=$(cat "$PASSFILE")

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DBUSER}'" | grep -q 1; then
  sudo -u postgres psql -qc "CREATE ROLE ${DBUSER} LOGIN PASSWORD '${PGPASS}';"
  ok "Created role ${DBUSER}"
else
  # Re-assert the password so .env and the server always agree.
  sudo -u postgres psql -qc "ALTER ROLE ${DBUSER} PASSWORD '${PGPASS}';"
  ok "Role ${DBUSER} present"
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DBNAME}'" | grep -q 1; then
  sudo -u postgres psql -qc "CREATE DATABASE ${DBNAME} OWNER ${DBUSER} ENCODING 'UTF8';"
  ok "Created database ${DBNAME}"
else
  ok "Database ${DBNAME} present"
fi

# Ownership matters: without it CREATE EXTENSION and CREATE TABLE both fail
# on PostgreSQL 15+.
sudo -u postgres psql -qc "ALTER DATABASE ${DBNAME} OWNER TO ${DBUSER};"
sudo -u postgres psql -q -d "${DBNAME}" \
  -c "GRANT ALL ON SCHEMA public TO ${DBUSER};" \
  -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" \
  -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
ok "Privileges and extensions in place"

# ----------------------------------------------------------------- restore ---
# Only runs when initdb just built an empty cluster and a dump is on disk.
if [ "${NEEDS_RESTORE:-0}" = "1" ]; then
  # Sort by filename, not mtime. The dumps are named pg-YYYYMMDD-HHMMSS.sql, so a
  # reverse lexical sort is a reverse chronological sort -- and unlike `ls -1t` it
  # survives a workspace restore, which rewrites every mtime to the same instant and
  # silently makes the oldest dump look newest.
  DUMP=$(ls -1 /home/user/DevelopmentFiles/backups/pg-*.sql 2>/dev/null | sort -r | head -1)
  if [ -n "$DUMP" ]; then
    PGPASSWORD="$PGPASS" psql -h 127.0.0.1 -U "${DBUSER}" -d "${DBNAME}" -q \
      < "$DUMP" >/dev/null 2>&1 || true
    ok "Restored from $(basename "$DUMP")"
  else
    info "No dump found — run db:migrate to build the schema"
  fi
fi

# -------------------------------------------------------------------- .env ---
ENVFILE=/home/user/WebApplication/server/.env
if [ -f "$ENVFILE" ]; then
  if grep -q '^PGPASSWORD=' "$ENVFILE"; then
    # Rewritten in python: sed would mangle / and & inside a base64 password.
    python3 - "$ENVFILE" "$PGPASS" <<'PY'
import re, sys
path, password = sys.argv[1], sys.argv[2]
text = open(path).read()
text = re.sub(r'^PGPASSWORD=.*$', 'PGPASSWORD=' + password, text, flags=re.M)
open(path, 'w').write(text)
PY
    ok "Synced PGPASSWORD in server/.env"
  else
    warn "server/.env has no PGPASSWORD line — add the block from .env.example"
  fi
else
  warn "server/.env not found — copy it from server/.env.example"
fi

echo
echo "Next:"
echo "  cd WebApplication"
echo "  npm --workspace @inwebtools/server run db:migrate   # apply the schema"
echo "  npm --workspace @inwebtools/server run db:doctor    # verify"
echo
