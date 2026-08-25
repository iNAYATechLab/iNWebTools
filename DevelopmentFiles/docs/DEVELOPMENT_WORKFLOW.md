# Development workflow

How a change travels from idea to a published release.

---

## 1. Branches

`main` is always releasable. Every change arrives through a branch:

| Prefix      | For                        | Example                          |
| ----------- | -------------------------- | -------------------------------- |
| `feat/`     | new capability             | `feat/role-based-auth`           |
| `fix/`      | defect repair              | `fix/rate-limiter-lockout`       |
| `refactor/` | behaviour-preserving change| `refactor/rebrand-inwebtools`    |
| `docs/`     | documentation only         | `docs/adr-postgresql`            |
| `chore/`    | tooling, deps, maintenance | `chore/bump-vite`                |

Branches stay short-lived. A branch open for a week is a merge conflict being written
in slow motion.

---

## 2. Before opening a pull request

Run the full gate locally — the same commands CI runs, no subset:

```bash
cd WebApplication
npx prettier --check .
npm run lint
(cd client && npx tsc --noEmit)
npm test
npx vitest run --root client
npm run build
```

> Running a *subset* of CI locally is how nine consecutive commits shipped with a red
> pipeline: the local routine skipped Prettier, so the failure was invisible until
> someone read the workflow logs. See
> [`ENGINEERING_STANDARDS.md`](./ENGINEERING_STANDARDS.md) §1.

---

## 3. The pull request

The template asks for what a reviewer actually needs:

- **What changed and why** — the reasoning, not a diff summary.
- **How it was verified** — commands run, cases exercised, screenshots for UI.
- **Risk** — what could break, and what to watch after deploy.

A PR that changes an architectural direction gets an
[ADR](./adr) in the same PR. The decision and its record land together, or the record
never gets written.

### Review checklist

- [ ] Does the change do what the description says, and only that?
- [ ] Is there a test that fails without the fix?
- [ ] Are errors handled — including the second network call, if there is one?
- [ ] Any secret, key or credential in the diff?
- [ ] Does a public API change update `docs/API.md`?
- [ ] Is the commit message findable by the symptom, not just the cause?

---

## 4. Merging

Squash-merge into `main` with a message that follows the commit convention. CI must be
green; a red pipeline is never merged "because the failure is unrelated" — if it truly
is unrelated, it gets its own fix first.

---

## 5. Releasing

```bash
# 1. full gate (§2) — green
# 2. bump the version in all three manifests
npm install --package-lock-only     # sync the lockfile
# 3. write the CHANGELOG entry
# 4. build and verify the artifact
node DevelopmentFiles/scripts/create-release-zip.mjs
#    unzip it, boot the server, confirm /health reports the new version
# 5. tag and push
git tag -a vX.Y.Z -m "iNWebTools vX.Y.Z — summary"
git push origin main --follow-tags
```

The tag triggers `.github/workflows/release.yml`, which builds the archive, computes a
SHA-256 and publishes the GitHub Release.

**Step 4 is not optional.** The v1.0.2 packager produced an archive whose server could
not start — every other check was green. See
[ADR-0004](./adr/0004-release-artifact-by-exclusion.md).

---

## 6. After a production incident

1. Fix it.
2. Write the regression test.
3. Record the rule in `ENGINEERING_STANDARDS.md` §3 if it generalises.
4. Note it in the changelog in terms of the symptom the user saw.

The fix is the cheap part. The rule is what stops the next one.
