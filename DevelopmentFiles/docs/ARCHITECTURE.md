# Architecture — iNWebTools

## 1. High-level overview

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser (SPA)                           │
│  React 18 + Vite + TypeScript                                    │
│                                                                  │
│  Dropzone ──▶ FileValidator ──▶ useTranscription() ──▶ fetch()   │
│      │                                    │                      │
│      └──▶ <AudioPlayer> (object URL)      └──▶ TranscriptPanel   │
└───────────────────────────┬──────────────────────────────────────┘
                            │  POST /api/transcribe (multipart/form-data)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Node.js 20 + Express 4 API                   │
│                                                                  │
│  helmet → cors → rateLimit → multer(memory/disk) → validate      │
│         → transcribeController → huggingface.service             │
│         → errorHandler (RFC-7807-ish JSON)                       │
└───────────────────────────┬──────────────────────────────────────┘
                            │  POST {HF_API_BASE_URL}/{ASR_MODEL}
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│              Hugging Face Inference API (Whisper)                │
└──────────────────────────────────────────────────────────────────┘
```

The browser **never** holds the Hugging Face token. The Express layer is a thin,
hardened proxy that adds authentication, validation, retries and rate limiting.

## 2. Request lifecycle

1. User drops an audio file → client-side guard checks extension, MIME and size.
2. An `ObjectURL` is created for instant local playback (no upload needed to listen).
3. On **Transcribe**, the file is sent as `multipart/form-data` field `audio`,
   optionally with `model` and `language` fields.
4. `multer` writes to `WebApplication/server/tmp` with a random filename (no user-controlled path).
5. Magic-byte sniffing confirms the real container matches the declared MIME.
6. `huggingface.service` streams the buffer to the Inference API with:
   - `Authorization: Bearer <token>`
   - exponential backoff on `503 model loading` / `429 rate limited`
   - a hard timeout (`HF_REQUEST_TIMEOUT_MS`) via `AbortController`
7. Temp file is deleted in a `finally` block regardless of outcome.
8. Response envelope is returned to the client.

## 3. API response envelope

Every endpoint returns the same shape, which keeps client handling trivial:

```jsonc
// success
{ "success": true,  "data": { /* … */ }, "meta": { "requestId": "…", "durationMs": 4213 } }

// failure
{ "success": false, "error": { "code": "FILE_TOO_LARGE", "message": "…", "details": {} },
  "meta": { "requestId": "…" } }
```

## 4. Key design decisions

| Decision                           | Rationale                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| npm **workspaces** monorepo        | One `npm install`, shared tooling, single ZIP release                         |
| **TypeScript everywhere**          | Compile-time contract between client and server types                         |
| Model **allow-list** in env        | Client can switch models without letting anyone bill arbitrary endpoints      |
| **Disk** temp storage (not memory) | 25 MB uploads × concurrency would blow heap; disk + immediate unlink is safer |
| Vite **dev proxy** `/api → :5000`  | No CORS pain in dev; the same relative URL works in prod behind one origin    |
| **Envelope** responses             | Uniform error handling, easy i18n mapping of `error.code`                     |
| Bilingual **i18n from day one**    | Retrofitting translations later is expensive                                  |

## 5. Error codes (stable contract)

| Code                     | HTTP | Meaning                                               |
| ------------------------ | ---- | ----------------------------------------------------- |
| `NO_FILE`                | 400  | No `audio` field in the request                       |
| `UNSUPPORTED_MEDIA_TYPE` | 415  | Extension/MIME/magic-bytes not an accepted audio type |
| `FILE_TOO_LARGE`         | 413  | Exceeds `MAX_UPLOAD_SIZE_MB`                          |
| `INVALID_MODEL`          | 400  | Requested model not in `ASR_ALLOWED_MODELS`           |
| `RATE_LIMITED`           | 429  | Too many requests from this IP                        |
| `UPSTREAM_UNAVAILABLE`   | 503  | HF model still loading after all retries              |
| `UPSTREAM_TIMEOUT`       | 504  | Inference exceeded `HF_REQUEST_TIMEOUT_MS`            |
| `UPSTREAM_ERROR`         | 502  | Any other Hugging Face failure                        |
| `INTERNAL_ERROR`         | 500  | Unhandled exception (details hidden in production)    |

## 6. Folder responsibilities (`WebApplication/server/src`)

| Path           | Responsibility                                                     |
| -------------- | ------------------------------------------------------------------ |
| `config/`      | Load `.env`, validate with Zod, export a frozen typed `env` object |
| `routes/`      | URL → controller wiring only; zero business logic                  |
| `controllers/` | HTTP-shaped I/O: read request, call service, format envelope       |
| `services/`    | Pure business logic + external calls (Hugging Face)                |
| `middlewares/` | Cross-cutting: upload, rate limit, 404, central error handler      |
| `utils/`       | `logger`, `ApiError`, `asyncHandler`, byte/format helpers          |

## 7. Future clients (later phases)

This Web Application is **phase 1** and owns the API. Two further surfaces will consume
the _same_ `/api/transcribe` contract without changes to it:

| Surface                                               | Repository path            | Phase |
| ----------------------------------------------------- | -------------------------- | ----- |
| Browser extensions (Android / iOS Safari / HarmonyOS) | `../../BrowserExtensions/` | 2     |
| Native mobile apps (Android / iOS / HarmonyOS)        | `../../MobileApplication/` | 3     |

Constraints designed in now so those phases stay cheap:

1. **One backend, many clients.** No client ever calls Hugging Face directly — the token
   never leaves this server.
2. **Stable error codes.** Section 5 is a contract; clients map `error.code` to their own
   localised strings.
3. **Bilingual parity.** Every user-visible string ships in both `bn` and `en`.
4. **Same limits everywhere.** Clients enforce `MAX_UPLOAD_SIZE_MB` and the MIME allow-list
   locally to fail fast, but the server remains the authority.

## 8. Non-goals (v1)

- No user accounts / persistence — transcripts live in browser memory only.
- No speaker diarization or word-level timestamps (possible v2 with `return_timestamps`).
- No self-hosted GPU inference; we rely on the HF hosted API.
