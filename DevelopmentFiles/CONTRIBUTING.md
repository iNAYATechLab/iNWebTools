# Contributing to iNWebTools

GitHub looks for this file by name and links to it from the issue and pull-request
forms, so it stays as the entry point. The detail lives in two documents rather than
being repeated here — a rule written in three places is a rule that will disagree with
itself within a month.

## Get running

```bash
git clone https://github.com/iNAYATechLab/iNWebTools.git
cd iNWebTools/WebApplication
cp .env.example .env          # add your HF_FREE_API_TOKEN
npm install
bash ../DevelopmentFiles/scripts/pg-setup.sh   # local PostgreSQL, one command
npm run dev                   # API :5000 · SPA :5173
```

Requires Node 20 LTS (`nvm use` reads `.nvmrc`) and npm 10+.

## Then read

| Document | What it covers |
| --- | --- |
| [`docs/DEVELOPMENT_WORKFLOW.md`](./docs/DEVELOPMENT_WORKFLOW.md) | Branch naming, the pre-PR checklist, review criteria, merging, releasing |
| [`docs/ENGINEERING_STANDARDS.md`](./docs/ENGINEERING_STANDARDS.md) | The quality gate, commit conventions, how bugs are handled, security rules |

Both state each rule alongside the failure that produced it. That is deliberate: a
standard with a scar attached gets followed, while one asserted in the abstract does not.

## The short version

- **Run the full gate before opening a PR** — Prettier, ESLint, `tsc`, both test suites,
  and the build. Exactly what CI runs, not a subset. (Running a subset is how nine
  consecutive commits shipped with a red pipeline.)
- **Every bug fix gets a test that fails without the fix.** The test is the part that
  lasts.
- **Commit messages name the symptom**, not just the code that moved.
  `fix(auth): stop a correct password from doing nothing at all` is findable later by
  the only thing anyone remembers.
- **Commits are authored with your own verified GitHub email.** `Co-authored-by:` is for
  people who genuinely worked on the patch. Attribution is a factual record, not a
  decoration.
- **No secrets in code.** Everything configurable goes through `.env` and
  `config/env.js`.

## Reporting bugs and requesting features

Use the issue templates in [`.github/ISSUE_TEMPLATE/`](../.github/ISSUE_TEMPLATE). For
anything security-related, follow [`SECURITY.md`](./SECURITY.md) instead of opening a
public issue.
