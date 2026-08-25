# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **A note on version numbers.** Development began under a `v0.1.x` → `v1.0.x` line,
> but that history was reset — see
> [`docs/HISTORY_REWRITE_2026-08-25.md`](./docs/HISTORY_REWRITE_2026-08-25.md) for why.
> Because the commits and artifacts those tags described are no longer reachable,
> versioning restarts here rather than resuming at 1.0.3. The code is mature, but the
> published release line is genuinely new, and a version number should describe what a
> reader can actually download.

## [Unreleased]

## [0.1.0-alpha.1] - 2026-08-25

First published release of iNWebTools: an Express API and a React + Vite + TypeScript
SPA that transcribe uploaded audio through Hugging Face Whisper, with role-based
accounts and an admin dashboard.

Marked **alpha** deliberately. Every feature below works and is covered by tests, but
the release line has no track record yet and several production concerns are still open
(see _Known limitations_). Alpha says "exercise this before you depend on it", which is
the honest description today.

### Added — transcription

- `POST /api/transcribe` accepts a multipart upload on the field `audio` and returns
  `{ text, model, characters, words, language, file }`.
- 99 languages plus Cantonese, validated against an allow-list so an unknown code fails
  fast with `400 UNSUPPORTED_LANGUAGE` instead of surfacing an upstream error.
- The model is configurable through `.env` (`HF_MODEL`), defaulting to
  `openai/whisper-large-v3-turbo`.
- Uploads are capped and validated by extension, MIME type **and** magic bytes, and the
  file is deleted on success and on failure alike.
- The Hugging Face token never leaves the server; no client ever calls the inference API.

### Added — accounts and roles

- Public sign-up, sign-in and password reset at `/api/auth` (`register`, `login`, `me`,
  `logout`, `refresh`, `forgot-password`, `reset-password`).
- Three roles — `user`, `admin`, `super_admin` — in a single `users` table. New accounts
  are always `user`; privilege is granted by an existing admin, never claimed at sign-up.
- Reusable RBAC middleware (`requireAuth`, `requireAdmin`, `requireRole(...)`). An
  unauthenticated request gets 401; a signed-in `user` reaching a staff route gets 403
  with the roles that would suffice, so the client can tell a stale session apart from a
  genuine refusal.
- Where a sign-in lands is decided server-side from one `ROLE_HOME` map and returned as
  `redirectTo`. The client holds no role-to-route knowledge.
- Sign-in, sign-up, forgot-password and reset-password pages share one layout with an
  animated SVG guide that watches the username field, covers its eyes while the password
  is masked, and cheers on success. It honours `prefers-reduced-motion`.
- Password reset links are written to the server log; the token lifecycle around them is
  complete, so adding an SMTP transport is the only remaining step.

### Added — admin dashboard

- Visitor and conversion analytics over six time ranges, an online-now view, a
  conversion log and a system error log with acknowledgement.
- Configurable upload limits, a global notice, and a header/footer CMS.
  `GET /api/layout/header-footer` is public; `POST` requires an admin JWT.

### Added — platform

- PostgreSQL with connection pooling, an idempotent schema, and
  `DevelopmentFiles/scripts/pg-setup.sh` to provision a local cluster, apply the schema
  and restore the newest dump in one command.
- Bilingual (বাংলা / English) dark-theme UI with drag-and-drop upload, audio preview and
  transcript export.
- 153 automated tests — 118 server, 35 client — with ESLint, Prettier and
  `tsc --strict` enforced by CI on every push.
- Reproducible releases: a tag triggers a workflow that builds the archive, computes a
  SHA-256, and publishes it. The packager verifies that every relative import in
  `server/index.js` resolves inside the staged tree before writing the zip.
- `BrowserExtensions/` and `MobileApplication/` scaffolded for phases 2 and 3.
- Four architecture decision records, written engineering standards and a development
  workflow document under `DevelopmentFiles/docs/`.

### Known limitations

Tracked openly rather than left implicit; these are why this is an alpha.

- No SMTP transport — password reset links appear in the server log.
- Refresh tokens cannot be revoked before expiry.
- Minimum password length is 6 characters.
- Admin error responses can surface raw database messages.
- Production still needs `TRUST_PROXY`, `CORS_ORIGIN`, TLS and a strong `JWT_SECRET`.
- The client bundle is ~648 kB before gzip.
- Two moderate npm advisories remain in the `react-router` dependency chain.
