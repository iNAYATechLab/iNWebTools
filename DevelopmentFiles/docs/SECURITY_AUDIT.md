# iNWebTools — Security & QA Audit (Step 4)

**Date:** 2026-08-25
**Scope:** `WebApplication/` (Express API + React client)
**Method:** black-box probing of a running instance, a mock upstream for provider
failure modes, and static review of the client for overflow/leak defects.

---

## 1. Findings summary

| #    | Finding                                                 | Severity | Status   |
| ---- | ------------------------------------------------------- | -------- | -------- |
| S-01 | Rate limiter bypassable via forged `X-Forwarded-For`    | **High** | ✅ Fixed |
| S-02 | `finalizing` progress phase unreachable (dead UI state) | Low      | ✅ Fixed |
| S-03 | Abort listener retained after request settled           | Low      | ✅ Fixed |
| S-04 | Blob URL leaked if component unmounts mid-download      | Low      | ✅ Fixed |
| S-05 | Health fetch wrote state after unmount (StrictMode)     | Low      | ✅ Fixed |
| S-06 | Long unbroken strings could force horizontal scroll     | Medium   | ✅ Fixed |
| S-07 | Header/progress flex children could overflow on mobile  | Low      | ✅ Fixed |

---

## 2. S-01 — Rate limit bypass (High)

### Cause

`index.js` hardcoded `app.set('trust proxy', 1)`. Express then derives the client
IP from the last hop of `X-Forwarded-For`, a header **any client can forge**.
When the server is exposed directly — which the default `HOST=0.0.0.0` invites —
an attacker rotates the header and receives a fresh rate-limit bucket per
request, giving unlimited access to the expensive AI endpoint.

### Proof (before the fix)

```
exhaust limit (3) from the real IP:      req 4 -> 429
spoof X-Forwarded-For: 1.2.3.4     ->    400   ← bypassed
spoof X-Forwarded-For: 5.6.7.8     ->    400   ← bypassed
spoof X-Forwarded-For: 9.10.11.12  ->    400   ← bypassed
```

### Fix

`TRUST_PROXY` is now an environment variable defaulting to **`false`**:

```js
app.set("trust proxy", env.TRUST_PROXY);
```

Accepts `false` (default) | `true` | hop count | comma-separated trusted IPs.

### Proof (after the fix)

```
default (TRUST_PROXY unset)
  real req 4                      -> 429
  spoof 1.2.3.4                   -> 429   ← held
  spoof 77.88.99.111              -> 429   ← held

TRUST_PROXY=1 (genuine proxy)
  proxied client req 4            -> 429   ← still per-client
  a different real client         -> 400   ← separate bucket, correct
```

> **Deployment note:** set `TRUST_PROXY=1` when running behind nginx, Render,
> Railway or Heroku. Leaving it unset behind a proxy makes every request appear
> to come from the proxy IP, so all users share one bucket.

---

## 3. Upload validation matrix

15 cases against `POST /api/transcribe`.

| Case                            | Result  | Code                                     |
| ------------------------------- | ------- | ---------------------------------------- |
| valid `.mp3` (ID3 tag)          | 503     | `HF_TOKEN_MISSING` (reached upstream ✅) |
| valid `.mp3` (raw frame sync)   | 503     | `HF_TOKEN_MISSING` ✅                    |
| valid `.wav`                    | 503     | `HF_TOKEN_MISSING` ✅                    |
| valid `.m4a`                    | 503     | `HF_TOKEN_MISSING` ✅                    |
| `image.png`                     | 415     | `UNSUPPORTED_MEDIA_TYPE`                 |
| `malware.exe`                   | 415     | `UNSUPPORTED_MEDIA_TYPE`                 |
| **PNG bytes renamed `.mp3`**    | **415** | blocked by magic-byte check              |
| **EXE bytes renamed `.wav`**    | **415** | blocked by magic-byte check              |
| **shell script renamed `.mp3`** | **415** | blocked by magic-byte check              |
| 11 MB file                      | 413     | `FILE_TOO_LARGE`                         |
| 9.99 MB file                    | 503     | accepted, reached upstream ✅            |
| 2-byte file                     | 415     | too small for a signature                |
| empty file                      | 415     | too small for a signature                |
| no file                         | 400     | `NO_FILE`                                |
| wrong field name                | 400     | `UNEXPECTED_FIELD`                       |

Extension and MIME checks alone are insufficient — the polyglot cases prove the
magic-byte layer is what actually stops a renamed executable.

### Path traversal

Uploading with `filename=../../../../etc/cron.d/pwned.mp3` wrote
`1787621857401-43be52b2d32f8aaf6989093c.mp3` inside the temp directory. Nothing
escaped; the client never controls the path on disk.

### Temp-file cleanup

After all 15 uploads plus traversal attempts, the temp directory contained
**0 files**. Cleanup also holds on the timeout path — no disk-exhaustion vector.

---

## 4. Upstream failure handling

Tested against a mock Hugging Face endpoint with an **invalid** token.

| Upstream              | HTTP | Code                 | Behaviour                     |
| --------------------- | ---- | -------------------- | ----------------------------- |
| 200 OK                | 200  | —                    | transcript returned           |
| **401 invalid token** | 502  | `HF_AUTH_FAILED`     | no retry (correct)            |
| 403 forbidden         | 502  | `HF_AUTH_FAILED`     | no retry                      |
| 404 model missing     | 502  | `HF_MODEL_NOT_FOUND` | no retry                      |
| 429 throttled         | 502  | `UPSTREAM_ERROR`     | retried, then surfaced        |
| 500 error             | 502  | `UPSTREAM_ERROR`     | retried, then surfaced        |
| 200 non-JSON          | 200  | —                    | treated as plain text         |
| **503 cold start**    | 200  | —                    | **recovered on attempt 3** ✅ |
| no response           | 504  | `UPSTREAM_TIMEOUT`   | aborted at 2.03 s             |
| **token missing**     | 503  | `HF_TOKEN_MISSING`   | actionable message            |

Auth failures are correctly **not** retried — retrying a rejected token wastes
time and can trip provider abuse detection.

**No token leakage:** `/health` and `/api/info` expose only a
`transcriptionReady` boolean. Asserted by test.

---

## 5. Rate limiting

- Limit enforced exactly: with `max=5`, requests 1–5 pass and 6+ return `429`.
- `Retry-After: 60` and draft-7 `RateLimit-Policy` / `RateLimit` headers present.
- `/health` and `/api/info` are **not** limited — monitoring cannot be starved.
- Skipped under `NODE_ENV=test` so CI is deterministic.

---

## 6. Client-side defects fixed

**S-02 — dead progress phase.** `finalizing` existed in the type, the checklist
and both translations, but nothing ever set it, so step 3 never lit up. Now
driven by the XHR `HEADERS_RECEIVED` state, guarded so a fast server cannot
rewind the checklist.

**S-03 — abort listener retained.** The `abort` listener on the caller's
`AbortSignal` was never removed, keeping the XHR and its `FormData` (holding a
File up to 10 MB) reachable. Now detached on `loadend`.

**S-04 — blob URL leak.** The download revokes its object URL after 1 s; an
unmount inside that window leaked it permanently. Pending URLs are now tracked
and revoked on unmount.

**S-05 — post-unmount state write.** `.finally()` still runs after an abort, so
StrictMode's double-mount updated an unmounted component. Guarded with an
`active` flag.

**S-06 — horizontal overflow.** A transcript containing a long unbroken string
(URL, ID, or Bengali conjuncts without spaces) could widen the page. Added
`overflow-wrap: break-word` to text elements and `overflow-x: hidden` on body.

**S-07 — flex overflow.** Flex children default to `min-width: auto` and refuse
to shrink below their content. Added `min-w-0` to the header logo and progress
text, `shrink-0` to controls, and `truncate` on the tagline.

---

## 7. Quality gates

```
format:check  ✅
lint          ✅  0 errors, 0 warnings
typecheck     ✅
test          ✅  31/31 (13 API + 18 security)
build         ✅  390 KB → 113 KB gzip
npm audit     ✅  0 vulnerabilities
```

`server/tests/security.test.js` locks in every finding above so a future
refactor cannot silently reintroduce them.

---

## 8. Residual risks (not blocking)

1. **`HF_FREE_API_TOKEN` still unset** in this environment — real transcription
   is unverified end-to-end. The mock covers the contract, not the live model.
2. **Rate limiting is in-memory.** Multiple instances each keep their own
   counter; use a shared Redis store before horizontal scaling.
3. **No virus scanning.** Magic-byte checks confirm the container is audio but
   do not scan for malicious payloads inside a genuine audio file.
4. **The PAT shared earlier in chat should be revoked.**
