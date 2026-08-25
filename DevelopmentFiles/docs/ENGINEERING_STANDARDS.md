# Engineering standards

The rules this codebase is held to, and — where a rule exists because something broke —
what broke. A standard with a scar attached is followed; a standard asserted in the
abstract is not.

---

## 1. The quality gate

Nothing merges to `main` until all of it passes. CI runs the same sequence, so a green
local run and a green pipeline mean the same thing.

| Gate            | Command                            | Requirement            |
| --------------- | ---------------------------------- | ---------------------- |
| Formatting      | `npx prettier --check .`           | clean                  |
| Linting         | `npm run lint`                     | 0 errors, 0 warnings   |
| Type checking   | `cd client && npx tsc --noEmit`    | clean, `strict` on     |
| Server tests    | `npm test`                         | all pass               |
| Client tests    | `npx vitest run --root client`     | all pass               |
| Production build| `npm run build`                    | succeeds               |
| Secret scan     | CI step                            | no tracked secrets     |

**Current: 153 automated tests — 118 server, 35 client.**

> **Why formatting is in the gate.** It was not, for a while. The local routine ran
> ESLint directly and never invoked Prettier, so CI failed on nine consecutive commits
> — always at the same step, before lint or tests ever ran. Nobody noticed, because the
> local signal was green and the pipeline's red was assumed to be about something else.
>
> **Rule:** the local gate must run *exactly* what CI runs. A gate that checks a subset
> is not a gate, it is a habit.

---

## 2. Commits

Format: `type(scope): imperative summary`, with a body explaining **why** when the
change is not self-evident.

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `build`, `chore`, `style`, `release`.

A bug-fix commit states the symptom the user experienced, not just the code that moved.
Compare:

```
fix(auth): update login handler          ← tells a future reader nothing
fix(auth): stop a correct password from doing nothing at all
```

The second is searchable by the symptom, which is how anyone actually looks for it.

Authorship uses an email registered to the committer's own GitHub account, so
`git log` stays a usable record of who to ask about a change. `Co-authored-by:` is for
people who genuinely worked on the patch.

---

## 3. Bugs

Every fixed bug gets a test that fails before the fix and passes after. The test is the
part that lasts; the fix without it is a fix that comes back.

Applied here:

- The sign-in handoff failure → 7 tests covering refused, failed and slow follow-up calls.
- The `Yesterday` 500 → 7 tests asserting every range key, and that no SQLite date
  helper survives anywhere in the source.
- The rate-limiter lockout → 4 tests for limiter and proxy configuration.
- The release packager omitting `db/` and `routes/` → an import-resolution guard that
  fails the build.

### Rules earned the hard way

- **Exercise every value of an enum when porting between engines.** `today` worked and
  `yesterday` returned 500; testing one proved nothing about the other.
- **Decide what happens when a second network call fails before shipping the first.**
- **Derive anything that must change at release time.** `/health` announced `1.0.0`
  for two releases because the version was a string literal.
- **A silent failure is worse than a loud one.** `pg-setup.sh` sent `initdb`'s error to
  `/dev/null` and exited under `set -e` having printed only "creating one at …".
- **Verify the artifact, not just the build.** Release checks unzip the archive and boot
  the server from it.

---

## 4. Security

- Secrets live in `.env`, reach code only through `config/env.js`, and are never
  committed. CI scans for tracked secrets; the release archive ships `.env.example` only.
- The Hugging Face token never leaves the server. No client calls the inference API.
- Passwords are bcrypt-hashed (cost 12). Uploads are capped and validated by extension,
  MIME type **and** magic bytes; uploaded files are deleted on both success and failure.
- Rate limits: sign-in 5/15 min, register 10/hr, reset 5/15 min. Successful sign-ins are
  not counted — the limiter exists to slow guessing, not to punish the people who got it
  right. Reset endpoints count successes too, because there a success has a cost.
- Authorisation is server-side on every protected route. Client-side role information is
  a convenience and is never trusted.
- `POST /api/layout/header-footer` requires an admin JWT; `GET` is public.

Known gaps are tracked openly in [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) rather than
left implicit. An honest list of what is not yet done is worth more than a claim of
completeness.

---

## 5. Repository structure

Four top-level folders. Three ship; one does not.

The dividing line: **if the running application needs it, it belongs to a product
folder. If only the people building it need it, it belongs in `DevelopmentFiles/`.**

That is why `package.json`, `.env`, `vite.config` and the ESLint config sit inside
`WebApplication/`, while docs, scripts, design references, QA notes and database dumps
sit in `DevelopmentFiles/`.

---

## 6. Releases

Semantic versioning. Every release is tagged, and the tag triggers a GitHub Actions
workflow that builds and publishes the archive with a SHA-256 checksum.

The changelog follows [Keep a Changelog](https://keepachangelog.com/), written for the
person upgrading: what changed, what breaks, what they must do about it. A breaking
change says so plainly — v1.0.2 invalidated every session and the entry leads with it.

Pre-release sequence:

1. Full quality gate (§1).
2. Version bumped in all three manifests, lockfile synced.
3. Changelog entry written.
4. Archive built, unzipped, and **booted** to confirm it runs.
5. Tag pushed; the workflow publishes.
