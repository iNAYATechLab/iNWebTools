# Versioning policy

Written down because the question "should this be 1.0 or an alpha?" has a real answer,
and answering it once beats re-litigating it at every release.

---

## The scheme: SemVer, with a caveat about what it means here

Releases are `MAJOR.MINOR.PATCH`, following
[Semantic Versioning](https://semver.org/), with pre-release suffixes
(`-alpha.N`, `-beta.N`, `-rc.N`) while a version is being stabilised.

The caveat matters. SemVer was designed for **libraries with a public API** — its whole
purpose is letting a dependency resolver decide whether an upgrade is safe. A web
application has no dependency resolver, and there is real disagreement about whether
SemVer even applies: the spec's first requirement is that the software declare a public
API, and for a UI-driven product the definition of a "backward incompatible change"
gets fuzzy fast.

Two things make it the right choice here anyway:

1. **This project does expose a public API.** `POST /api/transcribe` and the
   `/api/auth` surface are consumed by the browser extensions and mobile apps of phases
   2 and 3. Those clients ship on their own schedule and cannot be updated in lockstep
   with the server, so they need to know when a change breaks them. That is exactly the
   problem SemVer solves.
2. **Rollback decisions are faster.** A patch number says "small, safe to revert to the
   previous one". A calendar version says only *when* it shipped, which does not help at
   3am.

The alternative worth naming is **CalVer** (`2026.8.1`), which suits products that ship
continuously to a single deployment and have no external API consumers. If phases 2 and
3 were cancelled and this became a single hosted app, CalVer would be the better fit.

---

## Why the current release is `0.1.0-alpha.1` and not `1.0.0`

Under SemVer, `1.0.0` is not a quality badge. It is a **promise**: from here on, the
public API is stable, and breaking it requires a major bump with everything that
implies for downstream consumers.

The code is production-grade — 153 automated tests, enforced linting and strict types,
a green pipeline, decisions documented. That was never the question. The question is
whether the **API contract is settled**, and today it is not:

- Phases 2 and 3 have not been built. The first real external consumers of
  `/api/transcribe` and `/api/auth` do not exist yet, and building a client is how you
  discover that a response shape is wrong. Expect changes.
- Known gaps will change the contract: there is no SMTP transport (password reset
  currently logs its link), refresh tokens cannot be revoked, and production still needs
  `TRUST_PROXY`, `CORS_ORIGIN`, TLS and a strong `JWT_SECRET`. Closing those will alter
  request and response shapes.
- The published release line has no track record. Nothing has run in production yet.

Declaring 1.0.0 now would mean either breaking the promise within weeks, or freezing an
API that has never met a real client. Both are worse than an honest `0.x`.

**The counter-argument, stated fairly:** `0.x` is widely abused. Projects sit at
`0.x` for years while being depended on in production — the practice is mocked as
"ZeroVer" precisely because the zero stops meaning anything. A permanent `0.x` is a way
of avoiding commitment, and it is not what this policy intends.

So the zero here is time-boxed, with written exit criteria.

---

## Exit criteria for 1.0.0

`1.0.0` is cut when all of these are true:

- [ ] At least one browser extension or mobile client is consuming the API in a real
      build. The contract has met an external consumer.
- [ ] SMTP delivery is live; no credential flow depends on reading the server log.
- [ ] Refresh tokens can be revoked.
- [ ] A production deployment exists with TLS, `TRUST_PROXY`, `CORS_ORIGIN` and a
      strong `JWT_SECRET`, and has served real traffic.
- [ ] `docs/API.md` is complete for every public endpoint and matches the
      implementation — verified by a test, not by reading.
- [ ] No open item in `SECURITY_AUDIT.md` rated higher than low.

Until then the line runs `0.1.0-alpha.N` → `0.x.0-beta.N` → `1.0.0-rc.N` → `1.0.0`.

### What the stages mean

| Stage | Meaning |
| --- | --- |
| `alpha` | Feature-complete for its scope, but the API may change without notice. Do not build against it and expect stability. |
| `beta` | API expected to be final; hunting for defects and operational surprises. Breaking changes only with a stated reason. |
| `rc` | Believed shippable. Only fixes for release-blocking defects. |
| stable | The compatibility promise applies. Breaking it costs a major version. |

---

## Rules

- **The version lives in the source tree.** All three manifests
  (`WebApplication/package.json`, `client/`, `server/`) plus the lockfile are bumped in
  a commit; the tag follows the commit. A build server cannot decide whether a change is
  a fix, a feature or a break — only the person who wrote it can.
- **`/health` reports the version from the runtime manifest**, never a hardcoded string.
  It announced `1.0.0` for two releases because a literal was copied and forgotten.
- **The tag triggers the release.** Building and publishing are automated; deciding the
  number is not.
- **Never force-update a tag that has a published Release.** GitHub deletes the Release
  and its assets when you do.
- **The changelog is written for the person upgrading**: what changed, what breaks, what
  they must do. Breaking changes lead the entry.
- **Pre-release versions are marked as pre-releases on GitHub**, so nobody mistakes an
  alpha for a stable download.
