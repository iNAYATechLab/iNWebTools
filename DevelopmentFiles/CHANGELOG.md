# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.2] - 2026-08-25

The product is now **iNWebTools**, and accounts are no longer admin-only:
anyone can register, and the server decides where each role belongs. Three
sign-in bugs found by testing the app in a real browser are fixed — all three
looked like "nothing happens" to the person hitting them.

### Changed — rebrand

- Renamed Audio2Text to **iNWebTools** across 58 files: browser title and meta
  description, site header and footer, admin sidebar, npm package names
  (`@audio2text/*` → `@inwebtools/*`), workspace scripts, release and CI
  workflows, the release packager, all documentation and the licence.
- The PostgreSQL role and database keep their existing `inwebtools_app` /
  `inwebtools` names — they were never branded, and renaming a live database
  to match a logo is risk without benefit.

**Upgrading:** browser storage keys moved to `inwebtools.*` and `JWT_ISSUER`
changed, so every existing session is invalidated. Users sign in once more;
nothing else is required. Release artifacts are now named
`inwebtools-web-v<version>.zip`.

### Added — accounts and roles

- Public sign-up, sign-in and password reset at `/api/auth`
  (`register`, `login`, `me`, `logout`, `refresh`, `forgot-password`,
  `reset-password`). New accounts always get the `user` role; privilege is
  granted by an existing admin, never claimed at sign-up.
- `admin_users` merged into a single `users` table (`owner` → `super_admin`,
  `viewer` → `user`), with `password_reset_tokens` for single-use reset links.
- Reusable RBAC middleware: `requireAuth`, `requireAdmin`, `requireRole(...)`.
  An unauthenticated request gets 401; a signed-in `user` reaching a staff
  route gets 403 with the roles it would need, so the client can tell
  "sign in again" apart from "you may not do this".
- Sign-in, sign-up, forgot-password and reset-password pages sharing one
  layout, with an animated SVG guide that watches the username field, covers
  its eyes while the password is masked, peeks when it is revealed, and cheers
  on success. It honours `prefers-reduced-motion`.
- A `/Dashboard` landing page for the `user` role.
- Password reset links are written to the server log for now; swapping in an
  SMTP transport is the only change needed, as the token lifecycle around it
  is complete.

### Fixed

- **A correct password appeared to do nothing.** Sign-in stored its tokens and
  then called `GET /api/auth/me` a second time, and only that response
  populated the session. When the follow-up failed — a 403 from a stale bundle
  pointing at the staff-only `/me`, a dropped mobile connection, or simply
  losing the race with the redirect — the context stayed empty, the route
  guard read "not signed in", and it returned the user to the login form
  without a word while the server logged `login_success`. The account is now
  taken from the sign-in response directly.
- **Five successful sign-ins locked you out for fifteen minutes.** The
  rate limiter counted every request, not just failures. It now skips
  successful ones; the reset endpoints still count both, because there a
  success is what costs something.
- **Everyone shared one rate-limit bucket in development.** Behind the Vite
  proxy every request arrived as `127.0.0.1`, so one person exhausting the
  limit blocked all of them. `TRUST_PROXY` now defaults to one hop in
  development.
- **`Yesterday` on Time Range Stats returned 500.** Its predicate was still
  SQLite's `date('now', '-1 day')`, which PostgreSQL has no overload for. Its
  neighbour `today` had survived only by luck — `date('now')` parses there as
  a cast — so it gave right answers for the wrong reason and drew no attention
  to the pair. Both now use `CURRENT_DATE`.
- **The dashboard had a second, separate login form.** Signing in at `/login`
  and then visiting `/AdminDashboard` presented the form again. Guards now
  redirect rather than render, carrying the attempted path so sign-in resumes
  it, and a signed-in account that simply lacks the role is sent to its own
  home instead of a dead end.
- Guard redirects explain themselves: arriving at `/login` because a session
  expired now says so, instead of looking like a button that does nothing.
- `GET /api/auth/me` omitted `fullName` while `/login` returned it, so the
  dashboard greeting silently downgraded to the username on reload.
- `pg-setup.sh` failed silently when `initdb` did: the error went to
  `/dev/null` and the script stopped under `set -e` having printed only
  "creating one at …". It now keeps `/tmp/pg-initdb.log` and reports the
  failure, and grants directory traversal before `initdb` rather than after.

### Added — tests

- 7 tests pinning the time-range predicates, asserting the keys match the six
  buttons the UI renders and that no SQLite date helper survives. The admin
  router is skipped under `IS_TEST`, so these read the source instead.
- 7 tests covering the sign-in handoff: the dashboard must be reached even
  when the follow-up `/me` is refused, fails at the network level, or is slow.
- 4 tests for the rate-limiter and proxy configuration.
- Server suite 111 → 118; client suite 28 → 35.

### Removed

- ~600 MB of workspace cruft: a duplicate copy of Playwright's browsers, the
  SQLite-era TSV exports nothing read, and stale pre-migration dumps. Those
  dumps were a live hazard rather than clutter — `pg-setup.sh` restores from
  the newest one, and every one on disk predated the auth migration, so a
  rebuilt session would have resurrected the old schema. A current dump was
  taken first and `DevelopmentFiles/backups/README.md` now records the rule.

## [1.0.1] - 2026-08-25

Patch release. v1.0.0 shipped against a Hugging Face endpoint that was retired
shortly afterwards, so its artifact cannot transcribe at all. Anyone on 1.0.0
should upgrade.

### Fixed

- **Transcription was completely broken.** `api-inference.huggingface.co` was
  retired and now refuses connections outright. Calls go to
  `router.huggingface.co/hf-inference/models/<model>` instead.
- **The language selector did nothing.** The client sent a `language` form
  field that the server never read, so every request silently fell back to
  auto-detect. The hint is now forwarded to the model as
  `parameters.generate_kwargs.language` — the only shape the ASR pipeline
  accepts — which means switching to a base64 JSON body when a hint is present.
- **Non-Latin audio could come back in the wrong script.** On Bengali speech
  `whisper-large-v3-turbo` emitted Gujarati characters under auto-detect and
  fell into a repetition loop when the language was forced; its pruned decoder
  is unreliable on low-resource languages. The default is now
  `openai/whisper-large-v3`, verified to return the correct script for English,
  Bengali, Chinese, Hindi, Russian and Arabic with no hint supplied.
- Browser uploads failed behind tunnelled preview hosts (cloud IDEs, sandbox
  previews) because their ephemeral origin was rejected by CORS. Development
  now accepts any origin; production keeps the strict allow-list.
- The root `.env.example` documented `ASR_MODEL` and `ASR_ALLOWED_MODELS`,
  neither of which the server reads. Renamed to `HF_MODEL`.

### Added

- Language hints accept all 100 codes the model supports (Whisper's 99
  languages plus Cantonese), validated against an allow-list so an unknown code
  fails fast with `400 UNSUPPORTED_LANGUAGE` instead of surfacing an upstream
  error.
- `GET /api/info` now advertises `supportedLanguages` and `languageCount` so
  clients can discover the list instead of hard-coding it.
- The language picker offers every supported language behind a search field,
  each shown in its own script, with auto-detect and six common languages as
  one-tap options.
- `DevelopmentFiles/docs/HUGGINGFACE_TOKEN_GUIDE.md` — end-to-end token setup.
- 8 further integration tests covering the language contract (41 total).

### Changed

- `README.md` gained a "Languages & scripts" section recording the measured
  turbo-vs-large-v3 difference behind the model choice, and its backend stack
  row now says JavaScript ESM rather than TypeScript/Zod.
- `docs/API.md` corrected: it documented a per-request `model` field, a 25 MB
  cap and an `/api/info` response none of which existed.

## [1.0.0] - 2026-08-25

First complete release of the web application: Node/Express backend, React +
Vite + TypeScript frontend, bilingual (বাংলা / English) dark-theme UI,
drag-and-drop upload, audio preview and transcript export.

### Added — Step 1: Environment, GitHub & file structure

- npm workspaces monorepo scaffold (`server`, `client`) with pinned Node 20 (`.nvmrc`).
- Complete directory skeleton for backend and frontend with `.gitkeep` placeholders.
- Environment template `.env.example` covering runtime, Hugging Face, upload and security settings.
- Shared tooling: strict `tsconfig.base.json`, ESLint flat config, Prettier, `.editorconfig`.
- Workspace manifests and TypeScript configs for `server` and `client`.
- GitHub assets: CI workflow, bug/feature issue templates, PR template, `CONTRIBUTING.md`.
- Documentation set: `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/ROADMAP.md`,
  `docs/SETUP_GITHUB.md`.
- MIT `LICENSE`.

### Changed — multi-platform repository restructure

- Moved `client/` → `WebApplication/client/` and `server/` → `WebApplication/server/`
  (history preserved via `git mv`).
- Updated npm workspaces, `tsconfig` `extends` paths, ESLint globs, Prettier/Git ignores,
  VS Code search excludes and the CI artifact paths to the new locations.

### Added — platform scaffolding

- `BrowserExtensions/{Android,iPhone,HarmonyOS}/` with scoped READMEs (MV3, Safari Web
  Extension and ArkWeb plans).
- `MobileApplication/{Android,iPhone,HarmonyOS}/` with scoped READMEs (Compose, SwiftUI, ArkTS plans).
- `Screenshot/{DesktopScreenshot,TabletScreenshot,MobileScreenshot}/` with a naming
  convention and capture checklist.
- Platform matrix and multi-platform client rules documented in `README.md`
  and `docs/ARCHITECTURE.md`.

### Changed — phase-based repository restructure

- Flattened the layout to three product surfaces at the repository root:
  `WebApplication/` (active), `BrowserExtensions/` and `MobileApplication/` (later phases).
- Made `WebApplication/` fully self-contained: `package.json`, `package-lock.json`,
  `eslint.config.js`, `tsconfig.base.json`, `.prettierrc.json`, `.prettierignore`,
  `.nvmrc`, `.env.example`, `docs/` and `scripts/` all moved inside it.
- Workspaces simplified to `["server", "client"]`; `tsconfig` `extends` back to
  `../tsconfig.base.json`; ESLint globs and the Vite `loadEnv` root re-scoped.
- CI now uses `working-directory: WebApplication` with a path filter so unrelated
  phases never trigger a web build.
- Root `README.md` is now a portfolio index with the phase matrix; the full product
  documentation lives in `WebApplication/README.md`.

### Removed

- `Screenshot/` sub-READMEs consolidated; the folder remains for captured assets only.

### Changed — runtime / build-time separation

- Repository root reduced to four folders: three shippable products
  (`WebApplication/`, `BrowserExtensions/`, `MobileApplication/`) plus `DevelopmentFiles/`.
- Removed the redundant `inwebtools/` wrapper directory; the repository root is now the
  project root.
- Moved build-time-only assets into `DevelopmentFiles/`: `docs/`, `scripts/`,
  `Screenshot/`, `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md`; added `design/`,
  `qa/` and `notes/`.
- Runtime files (`package.json`, `package-lock.json`, `.env.example`, `tsconfig*`,
  `eslint.config.js`, `.prettierrc.json`, `vite.config.ts`, `client/`, `server/`)
  deliberately remain inside `WebApplication/` so `npm ci` and deployment keep working.
- `release:zip` now resolves to `../DevelopmentFiles/scripts/create-release-zip.mjs`.
- Root `README.md` documents the separation rule and the phase matrix.
- CI keeps `working-directory: WebApplication` and now also ignores documentation-only
  changes under `DevelopmentFiles/`.
