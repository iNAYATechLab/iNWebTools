# 🎙️ iNWEBTools

> Convert speech to text across every surface — web, browser extensions and mobile —
> powered by Hugging Face Whisper, with a bilingual (বাংলা / English) interface.

<p align="left">
  <img alt="CI" src="https://github.com/iNAYATechLab/iNWebTools/actions/workflows/ci.yml/badge.svg">
  <img alt="Release" src="https://img.shields.io/github/v/release/iNAYATechLab/iNWEBTools?display_name=tag&sort=semver">
  <img alt="Tests" src="https://img.shields.io/badge/tests-153%20passing-brightgreen">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Node" src="https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white">
</p>

**A product of [iNAYATechLab Private Limited](https://github.com/iNAYATechLab).**

---


## 🏭 How this project is built

Anyone evaluating a codebase is really asking one question: *can I trust what comes out
of it?* Rather than claim a standard, this repository makes the evidence checkable.

| Practice                       | Evidence                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| **Automated quality gate**     | 153 tests · ESLint 0 warnings · `tsc --strict` · Prettier — all enforced in CI on every push  |
| **Architecture decisions recorded** | [`docs/adr/`](./DevelopmentFiles/docs/adr) — why each hard choice was made, and what it cost |
| **Written engineering standards** | [`ENGINEERING_STANDARDS.md`](./DevelopmentFiles/docs/ENGINEERING_STANDARDS.md)             |
| **Every bug pinned by a test** | A fix without a regression test is a fix that comes back                                      |
| **Honest security posture**    | [`SECURITY_AUDIT.md`](./DevelopmentFiles/docs/SECURITY_AUDIT.md) lists what is *not* yet done |
| **Reproducible releases**      | Tag → GitHub Actions → source+build archive with SHA-256, boot-verified before publishing     |
| **Stated versioning policy**   | [SemVer with written 1.0 exit criteria](./DevelopmentFiles/docs/VERSIONING.md) — the version means something |
| **Changelog for humans**       | [Keep a Changelog](https://keepachangelog.com/) + SemVer, breaking changes stated first       |

Commit messages are written to be read: they name the symptom a user experienced, not
just the lines that moved. `fix(auth): stop a correct password from doing nothing at all`
is findable years later by the only thing anyone remembers — what went wrong.

---

## 📦 Repository layout

Four top-level folders. Three are **shippable products**; one holds everything that
only exists to help us build them.

```
inwebtools/
├── WebApplication/       ⭐ ACTIVE — React SPA + Express API + Hugging Face
├── BrowserExtensions/    ⏸️ Phase 2 — Android · iPhone · HarmonyOS
├── MobileApplication/    ⏸️ Phase 3 — Android · iPhone · HarmonyOS
└── DevelopmentFiles/     🛠️ Docs, scripts, design, QA, screenshots
```

| Folder                                      | Ships to production? | Status                        |
| ------------------------------------------- | -------------------- | ----------------------------- |
| [`WebApplication/`](./WebApplication)       | ✅ Yes               | ✅ Complete Version — Alpha   |
| [`BrowserExtensions/`](./BrowserExtensions) | ✅ Yes               | ⏸️ Not started                |
| [`MobileApplication/`](./MobileApplication) | ✅ Yes               | ⏸️ Not started                |

### The separation rule

> A file lives in a **product folder** if the running application needs it.
> It lives in **`DevelopmentFiles/`** if only the team needs it.

That means `package.json`, `.env`, `node_modules/` and build configs stay inside
`WebApplication/` — deployment resolves them relative to the app root. Documentation,
release scripts, design sources, QA plans and screenshots move out of the way.

---

## 🚀 Start here — Web Application

```bash
cd WebApplication
cp .env.example .env      # add your HUGGINGFACE_API_KEY
npm install
npm run dev               # API :5000  +  SPA :5173
```

Open **http://localhost:5173** in your browser.

### Which port is a website, and which is not

| Service            | Port   | Open in a browser?                        |
| ------------------ | ------ | ----------------------------------------- |
| SPA (Vite)         | `5173` | ✅ **Yes — this is the app**              |
| API (Express)      | `5000` | ✅ Yes, JSON only — e.g. `/health`        |
| PostgreSQL         | `5432` | ❌ **No — it speaks SQL, not HTTP**       |

> 🗄️ The store is **PostgreSQL**. `DevelopmentFiles/scripts/pg-setup.sh` provisions a
> local cluster, applies the schema and restores the newest dump in one command.
> It holds bcrypt password hashes and visitor IPs, so dumps are gitignored.
> See the **[PostgreSQL guide](./DevelopmentFiles/docs/POSTGRESQL_SETUP.md)** and
> **[ADR-0001](./DevelopmentFiles/docs/adr/0001-postgresql-over-sqlite.md)** for why
> SQLite was replaced.

Production uses a different layout — Nginx on `443` in front and the API on a
private address. Both environments are specified in the
**[Port Allocation Policy](./DevelopmentFiles/docs/PORTS.md)**.



📖 **Full product documentation:** [`WebApplication/README.md`](./WebApplication/README.md)

---

## 📚 Documentation

| Document                         | Location                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| Web App setup, scripts, env vars | [`WebApplication/README.md`](./WebApplication/README.md)                           |
| **Database — setup & operations** | [`DevelopmentFiles/docs/POSTGRESQL_SETUP.md`](./DevelopmentFiles/docs/POSTGRESQL_SETUP.md) |
| **Port allocation (dev & production)** | [`DevelopmentFiles/docs/PORTS.md`](./DevelopmentFiles/docs/PORTS.md)        |
| **Architecture decision records** | [`DevelopmentFiles/docs/adr/`](./DevelopmentFiles/docs/adr)                       |
| **Engineering standards**        | [`ENGINEERING_STANDARDS.md`](./DevelopmentFiles/docs/ENGINEERING_STANDARDS.md)      |
| **Versioning policy**            | [`VERSIONING.md`](./DevelopmentFiles/docs/VERSIONING.md)                            |
| **Sidebar widget engine**        | [`WIDGET_ENGINE.md`](./DevelopmentFiles/docs/WIDGET_ENGINE.md)                      |
| Architecture & error contract    | [`DevelopmentFiles/docs/ARCHITECTURE.md`](./DevelopmentFiles/docs/ARCHITECTURE.md) |
| API reference                    | [`DevelopmentFiles/docs/API.md`](./DevelopmentFiles/docs/API.md)                   |
| Roadmap                          | [`DevelopmentFiles/docs/ROADMAP.md`](./DevelopmentFiles/docs/ROADMAP.md)           |
| Contributing guide               | [`DevelopmentFiles/CONTRIBUTING.md`](./DevelopmentFiles/CONTRIBUTING.md)           |
| Security policy                  | [`DevelopmentFiles/SECURITY.md`](./DevelopmentFiles/SECURITY.md)                   |
| Changelog                        | [`DevelopmentFiles/CHANGELOG.md`](./DevelopmentFiles/CHANGELOG.md)                 |

---

## 🗺️ Development phases

### Phase 1 — Web Application 🚧 _current_

| Step | Scope                                                | Status     |
| ---- | ---------------------------------------------------- | ---------- |
| 1    | Environment, GitHub & file-structure setup           | ✅ Done    |
| 2    | Node.js/Express backend + Hugging Face API logic     | ✅ Done    |
| 3    | React frontend UI, drag-and-drop uploader & player   | ✅ Done    |
| 4    | Local server run, testing, security & error handling | ✅ Done    |
| 5    | ZIP release automation                               | ✅ Done    |

Beyond the original five steps: a role-based authentication system
(`user` / `Member`) with reusable RBAC middleware and a migration from
MySQL through PostgreSQL.

### Phase 2 — Browser Extensions ⏸️

Starts now that the Web Application has shipped. Targets: Android (Manifest V3),
iPhone (Safari Web Extension), HarmonyOS (ArkWeb).

### Phase 3 — Mobile Applications ⏸️

Native clients: Android (Kotlin + Compose), iPhone (Swift + SwiftUI),
HarmonyOS (ArkTS + ArkUI).

---

## 🔒 The golden rule

> The Hugging Face API token lives **only** in `WebApplication/server`.
> Extensions and mobile apps never call Hugging Face directly — they authenticate
> against our own backend and speak the same REST contract.

This keeps the key secret, centralises rate limiting and validation, and means a model
upgrade ships to every client without a store release.

---

© 2026 iNWebTools — [MIT Licensed](./LICENSE)
