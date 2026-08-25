# 🔌 Port Allocation Policy

The ports every iNWebTools service binds to, in development and in production,
and the reasoning behind each choice. This is the single source of truth — if a
config file disagrees with this table, the config file is wrong.

---

## 🛠️ Development

| Service                  | Port           | Bind address | Purpose                                        |
| ------------------------ | -------------- | ------------ | ---------------------------------------------- |
| Frontend (React / Vite)  | `5173` (alt `3000`) | `0.0.0.0`    | Client-side view — this is the app you open     |
| API Server (Node.js)     | `5000` (alt `4000`) | `0.0.0.0`    | Backend API endpoints for testing               |
| Database (SQLite)        | **none**       | —            | Embedded in the API process — a file, not a server |

**Current configuration:** Vite `5173`, API `5000` — both match the policy. The
database needs no port at all.

### Why the two web ports bind to `0.0.0.0`

They must be reachable from outside the container for the browser preview to
work.

### Why the database has no port

SQLite is embedded: `better-sqlite3` is compiled into the Node process, so a
query is a function call rather than a network round trip.

```
browser → Vite :5173 → proxy → Express :5000 → data/inwebtools.db
                                                └─ a file, opened in-process
```

This removes a whole class of problem the project previously hit — a port to
allocate, a daemon to supervise, credentials to manage. The database holds admin
password hashes and visitor IPs; with SQLite its access control is filesystem
permissions, not a network binding.

See [`POSTGRESQL_SETUP.md`](./POSTGRESQL_SETUP.md) for setup and operations.

### ⚠️ Avoid ports above 32768

Linux draws *outbound* connection source ports from the ephemeral range
(`/proc/sys/net/ipv4/ip_local_port_range`, typically `32768–60999`). A listener
inside that range is safe once started — the kernel will not reassign a bound
port — but if the service restarts while another process momentarily holds that
number, startup fails with `Address already in use`. The failure is intermittent
and appears only under load, which makes it painful to diagnose.

This was measured on this project: sampling 200 kernel-assigned ports produced
9 hits inside `43000–44000`. **Keep every service port below 32768.** If `5000`
or `5173` is taken, prefer another low port such as `4000` or `3000`.

---

## 🚀 Production

| Service                    | Port                        | Exposure          | Purpose                                              |
| -------------------------- | --------------------------- | ----------------- | ---------------------------------------------------- |
| Website (public web)       | `80` (HTTP) / `443` (HTTPS) | 🌍 Public          | Encrypted service for external users                  |
| API Server (internal)      | `3000` or `5000`            | 🔒 Behind Nginx    | Never exposed to the internet directly                |
| Database (SQLite)          | **none**                    | 🔒 Filesystem only | A file on the server's disk — nothing listens         |

### Topology

```
                    🌍 Internet
                         │
                    :80 → :443  (redirect to HTTPS)
                         │
                 ┌───────────────┐
                 │     Nginx     │  TLS termination + reverse proxy
                 └───────────────┘
                    │           │
          /  (static)         /api  → 127.0.0.1:5000  (Node.js, not public)
                                          │
                                 data/inwebtools.db   (SQLite file, no port)
```

### Rules

1. **`80` redirects to `443`.** Never serve the app over plain HTTP in
   production.
2. **The API listens on loopback only.** Bind it to `127.0.0.1:5000`, not
   `0.0.0.0:5000`, so the only way in is through Nginx. A firewall is a second
   line of defence, not the first.
3. **The database is never reachable from the internet.** With SQLite this is
   free: nothing listens on a port, so there is no network surface to attack.
4. **Protect the database file instead of a port.** Restrict it to the user the
   API runs as (`chmod 600`), keep it outside any directory Nginx serves, and
   include it in backups — it holds bcrypt password hashes and visitor IPs.
5. **Set `TRUST_PROXY=true`** behind Nginx, otherwise `req.ip` records the proxy
   rather than the visitor and rate limiting applies to the wrong address.
6. **Set `CORS_ORIGIN`** to the real public origin. The permissive development
   default must not reach production.

### Nginx sketch

```nginx
server {
    listen 80;
    server_name inwebtools.org;
    return 301 https://$host$request_uri;      # rule 1
}

server {
    listen 443 ssl http2;
    server_name inwebtools.org;

    ssl_certificate     /etc/letsencrypt/live/inwebtools.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/inwebtools.org/privkey.pem;

    root /var/www/inwebtools/dist;             # built SPA
    location / {
        try_files $uri $uri/ /index.html;      # client-side routing
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;      # rule 2
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        client_max_body_size 10m;              # keep in step with MAX_UPLOAD_SIZE_MB
    }
}
```

> `try_files ... /index.html` is required, otherwise a refresh on
> `/AdminDashboard/Logs/SystemErrors` returns 404 — Nginx would look for a file
> at that path instead of letting React Router resolve it.

---

## 🔀 Changing a port

1. Start the service on the new port.
2. Update the matching key in `WebApplication/server/.env` (`PORT`) — **not**
   the default in `config/env.js`, which should stay at the standard value for
   fresh installations.
3. Restart the API so it picks the change up.
4. Verify: `curl -s localhost:5000/health` should report `databaseReady: true`.

```bash
# Is a port free? `ss` alone can miss things, so bind-test it as well.
ss -ltn | grep ":5000"
python3 -c "import socket;s=socket.socket();s.bind(('127.0.0.1',5000));print('free');s.close()"
```

---

## 📁 Where each port is configured

| Port  | Configured in                                                     |
| ----- | ----------------------------------------------------------------- |
| `5173`| `WebApplication/client/vite.config.ts` → `server.port`             |
| `5000`| `WebApplication/server/.env` → `PORT` (default in `config/env.js`) |
| —     | The database uses no port. Its location is `DB_FILE` in `server/.env` |

The Vite dev server proxies `/api` and `/health` to the API, so browser code
only ever uses **relative URLs** — no hostname or port is hardcoded in the
bundle, and the same build works in every environment.
