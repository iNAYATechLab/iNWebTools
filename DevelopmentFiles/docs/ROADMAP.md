# Delivery Roadmap — Web Application (Phase 1)

Five steps to v1.0.0. Browser extensions (phase 2) and mobile apps (phase 3)
start only after this phase ships.

## ✅ Step 1 — Environment, GitHub & file structure

- [x] npm workspaces (`server`, `client`) self-contained in `WebApplication/`
- [x] Full directory skeleton with `.gitkeep` placeholders
- [x] `.gitignore`, `.env.example`, `.editorconfig`, `.nvmrc`, `LICENSE`
- [x] Shared tooling config: ESLint (flat), Prettier, base `tsconfig`
- [x] GitHub assets: CI workflow, issue templates, PR template, `CONTRIBUTING.md`
- [x] Documentation: README, ARCHITECTURE, API, ROADMAP, SETUP_GITHUB
- [x] Local git repository initialised with an initial commit
- [x] Repository split into phase folders: `WebApplication/` (active),
      `BrowserExtensions/`, `MobileApplication/`, `Screenshot/` (later phases)
- [x] Toolchain verified green: install, format, lint, typecheck, build

## ✅ Step 2 — Backend + Hugging Face logic

- [x] `config/env.js` — validated environment loader, fails fast on bad values
- [x] `utils/` — `logger` (JSON in prod), `ApiError`, `asyncHandler`
- [x] `middlewares/upload.js` — multer, 10 MB cap, extension + MIME + magic-byte checks
- [x] `services/huggingface.service.js` — retries, backoff, AbortController timeout
- [x] `index.js` — `/health`, `/api/info`, `/api/transcribe`, helmet, CORS, rate limit
- [x] Guaranteed temp-file deletion via `finally`
- [x] 13 integration tests (validation, limits, cleanup, 404)

## ✅ Step 3 — React frontend

- [x] Vite + TS scaffold, design tokens, dark theme (Tailwind v4)
- [x] `<Dropzone>` — drag & drop + click-to-browse + client-side validation
- [x] `<AudioPlayer>` — waveform-less custom player (play/pause, seek, time, speed)
- [x] `<TranscriptPanel>` — copy, download `.txt`, word/char counters
- [x] `<LanguageSelector>` (100 spoken languages, searchable), `<LocaleToggle>` (বাংলা ⇄ English)
- [x] `useTranscription` hook with progress + cancellation
- [x] Fully responsive, keyboard accessible, ARIA-labelled
- [ ] `<ModelSelector>` — dropped. The model is fixed per deployment via
      `HF_MODEL`; letting clients pick one is an abuse vector and the wrong
      model silently breaks script output.

## ✅ Step 4 — Local run, testing, security & error handling

- [x] `npm install` + `npm run dev` verified end-to-end against the live API
- [x] Vitest unit tests (env, validators, HF service) + supertest integration tests — 41 passing
- [x] Helmet, strict CORS, rate limit, payload caps verified
- [x] Negative-path matrix: no file, wrong type, oversized, bad token, bad language, timeout
- [x] Temp-file cleanup verified leak-free on both success and failure paths
- [x] Script-correctness verified on real speech in 6 languages (en, bn, zh, hi, ru, ar)
- [ ] `docs/TESTING.md` with the manual QA checklist

## ✅ Step 5 — ZIP release automation

- [x] `DevelopmentFiles/scripts/create-release-zip.mjs` — build → stage → versioned ZIP + SHA-256
- [x] `.github/workflows/release.yml` — version bump / tag / manual → quality gate → publish
- [x] Generated release notes from the commit log; duplicate-release guard
- [x] `CHANGELOG.md` maintained (Keep a Changelog)

---

## 📦 Release history

| Version  | Status      | Notes                                                        |
| -------- | ----------- | ------------------------------------------------------------ |
| `v1.0.1` | current     | Fixes a dead upstream endpoint, the no-op language selector and wrong-script output |
| `v1.0.0` | superseded  | Artifact cannot transcribe — built against the retired `api-inference` host |
| `v0.1.x` | superseded  | Early scaffolding previews                                    |

---

## 🔭 Later phases (outside this folder)

Tracked here for visibility; implemented after Web Application v1.0.0.

### Phase 2 — Browser extensions (`../../BrowserExtensions/`)

- [ ] Android — Manifest V3 popup (Kiwi / Firefox for Android)
- [ ] iPhone — Safari Web Extension + Xcode container app
- [ ] HarmonyOS — ArkWeb extension host

### Phase 3 — Mobile applications (`../../MobileApplication/`)

- [ ] Android — Kotlin + Jetpack Compose
- [ ] iPhone — Swift + SwiftUI
- [ ] HarmonyOS — ArkTS + ArkUI

### Assets (`../Screenshot/`)

- [ ] Desktop / Tablet / Mobile captures in both `bn` and `en`
- [ ] Store-listing sets for Play Store, App Store and AppGallery
