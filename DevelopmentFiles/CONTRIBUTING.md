# Contributing to iNWebTools

Thanks for helping build iNWebTools. This document defines the engineering standards
every contribution must meet.

## 1. Prerequisites

- Node.js **20 LTS** (`nvm use` reads `.nvmrc`)
- npm **10+**
- Git 2.4+
- A Hugging Face **read** token in your local `.env`

## 2. Local setup

All active development happens inside `WebApplication/`.

```bash
git clone https://github.com/iNAYATechLab/inwebtools.git
cd inwebtools/WebApplication
cp .env.example .env      # add your HF_FREE_API_TOKEN
npm install
npm run dev
```

## 3. Branching model

| Branch          | Purpose                                                  |
| --------------- | -------------------------------------------------------- |
| `main`          | Always deployable, protected, release tags cut from here |
| `develop`       | Integration branch for the next release                  |
| `feat/<scope>`  | New feature                                              |
| `fix/<scope>`   | Bug fix                                                  |
| `chore/<scope>` | Tooling, deps, CI                                        |
| `docs/<scope>`  | Documentation only                                       |

Example: `feat/dropzone-validation`, `fix/hf-503-retry`.

## 4. Commit convention — Conventional Commits

```
<type>(<scope>): <short imperative summary>

[optional body — the why, not the what]
[optional footer — Closes #12]
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Examples:

```
feat(server): add exponential backoff for HF 503 model-loading responses
fix(client): revoke object URL on unmount to stop memory leak
docs(api): document /api/models allow-list endpoint
```

## 4.1 Commit authorship

Every commit is authored by the person who actually wrote it, using an email
registered to their own GitHub account. This is not bureaucracy: GitHub resolves
commits to accounts **by email**, so an unregistered address produces a commit
attributed to nobody, and `git log` stops being a usable record of who to ask
about a change.

```bash
git config user.name  "Your Name"
git config user.email "you@example.com"   # must be verified on your GitHub account
```

When two or more people genuinely worked on a change together — pairing, or a
review that reshaped the patch — credit them with `Co-authored-by:` trailers as
the last lines of the message, after a blank line:

```
fix(auth): stop the rate limiter locking out correct sign-ins

Co-authored-by: Real Person <real.person@example.com>
```

Only list people who actually contributed. Attribution is a factual record, not
a decoration.

## 5. Code standards

- **TypeScript strict mode** — no `any` without a written justification comment.
- **No secrets in code.** Everything configurable goes through `.env` + `config/env.ts`.
- **Server layering:** `route → controller → service`. Controllers never call `fetch` directly.
- **Phase discipline:** only `WebApplication/` is active. Do not open PRs against
  `BrowserExtensions/` or `MobileApplication/` until their phase begins.
- **Where does a new file go?** If the running app needs it → the product folder
  (`WebApplication/`). If only the team needs it → `DevelopmentFiles/`.
- **Never call Hugging Face from a client** — always go through `WebApplication/server`.
- **Errors:** throw `ApiError` with a stable `code`; the central error handler formats it.
- **UI copy:** every user-visible string must exist in both `i18n/bn.json` and `i18n/en.json`.
- **Accessibility:** interactive elements need keyboard support and ARIA labels.
- **Formatting:** Prettier is the single source of truth — run `npm run format`.

## 6. Before opening a PR

```bash
cd WebApplication
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

Then fill in the PR template completely. PRs need a green CI run and one review.

## 7. Reporting bugs / requesting features

Use the GitHub issue templates. Include the audio file characteristics
(format, size, duration, language) for transcription-related bugs.
