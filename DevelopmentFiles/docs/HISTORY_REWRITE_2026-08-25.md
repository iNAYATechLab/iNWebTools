# History rewrite — 25 August 2026

A record of what was changed in the Git history, why, and what remains outstanding.
Rewriting published history is disruptive enough that it should never be undocumented.

---

## Why

Until this date, commits were attributed to a roster of thirty names held in
`DevelopmentFiles/scripts/contributors.json`, each paired with a fabricated
`@inayatechlab.com` address, and a generator script rotated them across commits so the
log would look like the work of a large team.

The names were not invented. They belonged to **real, well-known Bangladeshi
developers** — among them the founder of Programming Hero and the author of the standard
Bangla programming textbook. Presenting them as staff of this company was a false claim
of professional association attached to identifiable people, and it was reproduced in
full by anyone who cloned the repository.

It also did not work. GitHub resolves a commit to an account **by email address**. An
address that belongs to no account links to nobody, which is why fifty-three commits
spread across thirty names still rendered as a single contributor. The mechanism could
never have produced the effect it was built for.

---

## What was changed

Three passes with `git filter-repo`, each verified before the next:

1. **Identity.** Author and committer on all 58 commits set to
   `iNAYATechLab <inayatechlab@gmail.com>`. All `Co-authored-by:` trailers naming roster
   members removed.
2. **Roster blobs.** `contributors.json` and `generate-commit.mjs` erased from *every*
   commit that contained them — deleting a file in a new commit leaves all earlier
   versions intact and reachable. The multi-author section of `CONTRIBUTING.md` was
   rewritten across its whole history, and the `"commit"` npm alias that invoked the
   generator was stripped from every historical `package.json`.
3. **Tags.** `v0.1.0`, `v0.1.1`, `v1.0.0`, `v1.0.1` and `v1.0.2` were still anchored to
   pre-rewrite commits, so a fresh clone kept pulling the old identities back. Each was
   re-pointed at its equivalent commit in the rewritten history.

**Commit messages were left untouched.** They are the most valuable part of this
history and none of them referenced the roster.

### Verification

- Every blob in the object database scanned against all thirty names plus the script
  and roster filenames: **0 matches**.
- `git log --all --format='%an <%ae>'` across a fresh clone: one identity.
- Full quality gate after the rewrite: 118 server tests, 35 client tests, ESLint clean,
  `tsc --noEmit` clean, Prettier clean, production build succeeds.
- All manifests re-validated as parseable JSON after in-history editing.

---

## What remains — unreachable objects on GitHub

Force-pushing does not delete the old commits from GitHub's storage. They are
unreferenced by any branch or tag, invisible in the UI and absent from a clone, but they
remain retrievable **by exact SHA** through the API until GitHub runs garbage collection
on the repository.

Current exposure is low:

| Factor | State |
| --- | --- |
| Repository visibility | **Private** |
| Forks | **0** — no shared object network |
| Stars / watchers | 0 |
| Old SHAs published anywhere | No |

Nobody who lacks the SHAs can reach them, and the SHAs exist only in this workspace.

**To close it completely** — recommended before the repository is ever made public —
contact GitHub Support and ask them to run `git gc` on
`iNAYATechLab/iNWebTools` to purge unreachable objects. This is a routine request and
the only way to force collection; there is no API or setting for it.

The alternative, if the repository is to go public soon: create a fresh repository and
push the rewritten history into it. A repository with no prior objects has nothing to
collect.

---

## Side effect: published Releases were destroyed

Force-updating the five version tags to their rewritten commits caused GitHub to
**delete every GitHub Release attached to them**, along with the uploaded archives and
checksums. The tags survived; the Releases built on top of them did not.

`release.yml` did not repair this. Its guard step asks `gh release view "$TAG"` and
skips when a release already exists — correct in isolation, but the tag push that
destroys a release and the workflow run that would recreate it happen in the same
moment, so the guard can observe the release that is about to disappear.

The v1.0.2 release was recreated manually via the REST API with notes taken from the
changelog, and both assets re-uploaded and verified as `state: uploaded`. The earlier
v0.1.0–v1.0.1 releases were not recreated: their artifacts were built from a history
that no longer exists, and manufacturing new archives under old version numbers would
misrepresent what those versions contained. Their tags remain, so the source for each
is still reachable.

**Rule adopted:** never force-update a tag that has a published Release. If history
must be rewritten, expect to recreate the Releases afterwards, and verify the assets
are back rather than trusting a green workflow run.

## Local backups

Two tags in the local clone preserve the pre-rewrite state, and are intentionally
**not pushed**:

- `backup-before-author-rewrite`
- `backup-before-blob-purge`

Delete them once the result has been reviewed and accepted.

---

## The rule going forward

Attribution is a factual record. A commit is authored by the person who wrote it, using
an email registered to their own GitHub account; `Co-authored-by:` is for people who
genuinely worked on the patch. See [`../CONTRIBUTING.md`](../CONTRIBUTING.md) §4.1.

Credibility comes from evidence a reader can check — tests, CI, recorded decisions,
honest security notes — not from the length of the contributor list.
