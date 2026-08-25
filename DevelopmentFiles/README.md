# 🛠️ DevelopmentFiles

Everything needed to **build** iNWebTools, and nothing needed to **run** it.

> **Rule of thumb:** if deleting a file would break the live server or a shipped app,
> it does **not** belong here. If it only helps humans build, test, document or release
> the product, it belongs here.

---

## 📂 Contents

| Folder / file                          | Purpose                                                        |
| -------------------------------------- | -------------------------------------------------------------- |
| [`docs/`](./docs)                      | Architecture, API reference, roadmap, GitHub setup guides      |
| [`scripts/`](./scripts)                | Build & release automation (ZIP packaging — Step 5)            |
| [`Screenshot/`](./Screenshot)          | Product and store-listing captures (Desktop / Tablet / Mobile) |
| [`design/`](./design)                  | Wireframes, mockups, design tokens, logo sources               |
| [`qa/`](./qa)                          | Test plans, manual QA checklists, sample audio files           |
| [`notes/`](./notes)                    | Meeting notes, research, decision scratchpads                  |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Branching model, Conventional Commits, PR rules                |
| [`CHANGELOG.md`](./CHANGELOG.md)       | Keep a Changelog / SemVer history                              |
| [`SECURITY.md`](./SECURITY.md)         | Vulnerability reporting and security practices                 |

---

## 🚫 What is deliberately NOT here

These are **runtime dependencies** and must stay inside their product folder
(`WebApplication/`, and later `BrowserExtensions/` and `MobileApplication/`):

| File                                   | Why it must stay with the app                                 |
| -------------------------------------- | ------------------------------------------------------------- |
| `package.json`, `package-lock.json`    | `npm ci` on the server resolves them relative to the app root |
| `node_modules/`                        | Runtime module resolution                                     |
| `.env`, `.env.example`                 | Loaded by the server process at boot                          |
| `tsconfig*.json`                       | Referenced by the build; ships with the source tree           |
| `eslint.config.js`, `.prettierrc.json` | Workspace-relative; tooling expects them beside the code      |
| `vite.config.ts`                       | Build entry point for the SPA                                 |
| `client/`, `server/`                   | The application itself                                        |

Moving any of these into `DevelopmentFiles/` would break `npm ci`, Docker builds
and deployment. Keeping them in place is intentional, not an oversight.

---

## 📦 Documentation index

| Document                                         | What it covers                                                 |
| ------------------------------------------------ | -------------------------------------------------------------- |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System design, request lifecycle, error-code contract          |
| [`docs/API.md`](./docs/API.md)                   | REST contract: `/api/health`, `/api/models`, `/api/transcribe` |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md)           | The 5-step delivery plan and later phases                      |
| [`docs/SETUP_GITHUB.md`](./docs/SETUP_GITHUB.md) | Repo creation, first push, branch protection                   |

---

## 🧪 Suggested conventions

- **`qa/samples/`** — short audio clips (< 1 MB) for manual testing. Keep large media
  out of git; link to external storage instead.
- **`design/`** — export flattened PNG/SVG alongside source files so reviewers without
  Figma/Illustrator can still see them.
- **`notes/`** — date-prefixed files, e.g. `2026-08-25-model-selection.md`.
- **`Screenshot/`** — see [its README](./Screenshot/README.md) for the naming convention.
