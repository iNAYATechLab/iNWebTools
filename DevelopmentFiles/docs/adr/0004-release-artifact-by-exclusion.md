# ADR-0004 — Package releases by exclusion, not by allow-list

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

`create-release-zip.mjs` assembled the deployable archive by copying a named list of
server directories:

```js
for (const entry of ["index.js", "config", "middlewares", "services", "utils"]) {
```

That list was correct when it was written. Then `db/` and `routes/` were added to the
server, and nobody remembered the packager — there was no reason to think about it while
writing a route.

The v1.0.2 archive was therefore missing **every route file and the entire database
layer**, while `server/index.js` imports both within its first fifteen lines. Unzip it,
`npm start`, and the process dies at module resolution. The packager reported success.
Every check was green. The build was simply not there.

An allow-list fails in the dangerous direction: forgetting to add something produces a
broken artifact, silently.

## Decision

Copy the whole `server/` tree except an explicit exclusion set — `node_modules`,
`tests`, `tmp`, `.env`, `coverage`, and the manifest that is generated separately.

Then **verify**: parse the relative imports out of the staged `index.js` and fail the
build if any of them does not resolve inside the staged tree.

```js
const missing = [...indexSource.matchAll(/from\s+["']\.\/([^"']+)["']/g)]
  .map((m) => m[1])
  .filter((rel) => !fs.existsSync(path.join(stageDir, "server", rel)));
if (missing.length > 0) { log.fail(...); process.exit(1); }
```

## Consequences

- A new server directory is included automatically.
- Failure mode inverts: the worst case is shipping a file nobody needed, instead of
  omitting one the process cannot start without.
- The exclusion set is now the thing to keep honest, and it is short, stable, and
  security-relevant (`.env` must never be in an artifact) — so it gets reviewed.
- The guard is not a substitute for testing the artifact. Release verification now
  unzips the archive and boots the server from it, confirming `/health` reports the
  expected version with `db`, `auth` and `asr` all ready.

## The wider lesson

The version bump also revealed `/health` announcing `version: '1.0.0'` — a string
literal since the first release, never updated because nothing failed when it drifted.
It now reads the runtime manifest.

**Rule adopted:** anything that must change at release time should be derived, not
copied. A value maintained by memory is a value that is eventually wrong, and a hardcoded
copy is the one place nobody thinks to check.

## Alternatives considered

- **Keep the allow-list, add a review checklist item.** Rejected: it relies on the same
  memory that failed, and the cost of forgetting is a broken public release.
- **Build a container image instead.** A stronger answer, and a likely future step, but
  it replaces the artifact format rather than fixing the packaging bug, and the target
  deployment expects a source archive today.
