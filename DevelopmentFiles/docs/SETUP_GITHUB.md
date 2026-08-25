# GitHub Setup — first push & repository hardening

The local repository is already initialised with an initial commit on branch `main`.
Follow these steps to publish it.

## 1. Create the remote repository

**Option A — GitHub CLI (fastest)**

```bash
gh auth login
gh repo create inwebtools --private --source=. --remote=origin --push
```

**Option B — Web UI**

1. Go to <https://github.com/new>.
2. Repository name: `inwebtools`. Visibility: Private (or Public).
3. **Do not** initialise with a README, .gitignore or license — we already have them.
4. Then:

```bash
git remote add origin https://github.com/iNAYATechLab/inwebtools.git
git branch -M main
git push -u origin main
```

## 2. Create the integration branch

```bash
git checkout -b develop
git push -u origin develop
```

## 3. Verify no secrets were pushed

```bash
git ls-files | grep -E '(^|/)\.env$' && echo "❌ .env is tracked — remove it!" || echo "✅ .env is not tracked"
```

If `.env` was ever committed, rotate the Hugging Face token immediately and purge it:

```bash
git rm --cached .env
git commit -m "chore: remove accidentally committed .env"
```

## 4. Recommended branch protection (Settings → Branches → Add rule)

For `main`:

- ✅ Require a pull request before merging (1 approval)
- ✅ Require status checks to pass → select **CI / Lint · Typecheck · Test · Build**
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Do not allow force pushes / deletions

## 5. Repository secrets (Settings → Secrets and variables → Actions)

| Secret              | Used by                                           |
| ------------------- | ------------------------------------------------- |
| `HF_FREE_API_TOKEN` | Optional — only if you add live integration tests |

CI currently runs with a dummy token, so no secret is strictly required.

## 6. Recommended repository settings

- Description: `MP3 to Text web app — React + Express + Hugging Face Whisper, bilingual UI (বাংলা/English).`
- Topics: `speech-to-text`, `whisper`, `hugging-face`, `react`, `express`, `typescript`, `bangla`
- Features: enable **Issues** and **Discussions**; disable Wiki/Projects if unused.
- General → Pull Requests: allow **Squash merging** only; auto-delete head branches.

## 7. Automatic releases

The `.github/workflows/release.yml` workflow publishes a versioned GitHub Release
with a deployable ZIP and its SHA-256 checksum. Three ways to trigger it:

### A. Version bump (recommended — fully automatic)

```bash
cd WebApplication
npm version patch --no-git-tag-version   # or: minor / major
cd ..
git add WebApplication/package.json
git commit -m "chore(release): v$(node -p "require('./WebApplication/package.json').version")"
git push origin main
```

Pushing a changed `WebApplication/package.json` to `main` makes the workflow tag
`v<version>` and publish the release automatically.

### B. Push a tag

```bash
git tag -a v1.0.0 -m "iNWebTools v1.0.0"
git push origin v1.0.0
```

### C. Manual run

**Actions → Release → Run workflow**, optionally typing a version.

### What the release contains

| Asset                              | Description                                                           |
| ---------------------------------- | --------------------------------------------------------------------- |
| `inwebtools-web-vX.Y.Z.zip`        | Compiled server + built SPA + production `package.json` + `DEPLOY.md` |
| `inwebtools-web-vX.Y.Z.zip.sha256` | Integrity checksum                                                    |

Release notes are generated from the commit log since the previous tag.

**Safety features:** the workflow re-runs lint/typecheck/tests before packaging,
skips silently if the version was already released, and never ships `.env` or
`node_modules`.
