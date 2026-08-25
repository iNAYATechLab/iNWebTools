# API Reference — iNWebTools

Base URL (dev): `http://localhost:5000/api`
The SPA calls it through the Vite proxy as `/api`.

All responses use the envelope described in [ARCHITECTURE.md](./ARCHITECTURE.md#3-api-response-envelope).

---

## `GET /health`

Liveness/readiness probe. No authentication.

**200 OK**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptimeSec": 128.4,
    "version": "0.1.0",
    "model": "openai/whisper-large-v3",
    "hfConfigured": true
  },
  "meta": { "requestId": "b0f1…", "timestamp": "2026-08-25T09:12:44.120Z" }
}
```

---

## `GET /api/info`

Returns non-sensitive limits so the client can validate before uploading.

**200 OK**

```json
{
  "success": true,
  "data": {
    "project": "iNWebTools",
    "model": "openai/whisper-large-v3",
    "maxUploadSizeMb": 10,
    "allowedExtensions": [".mp3", ".wav", ".m4a"],
    "supportedLanguages": ["af", "am", "ar", "…", "yue", "zh"],
    "languageCount": 100,
    "rateLimit": { "maxRequests": 20, "windowMinutes": 15 }
  },
  "meta": { "requestId": "9c2a…", "durationMs": 1, "timestamp": "2026-08-25T03:24:00.000Z" }
}
```

`supportedLanguages` is the authoritative allow-list for the `language` field
below; clients should read it rather than hard-coding codes.

---

## `POST /api/transcribe`

Transcribes an uploaded audio file.

**Content-Type:** `multipart/form-data`

| Field      | Type   | Required | Notes                                                            |
| ---------- | ------ | -------- | ---------------------------------------------------------------- |
| `audio`    | file   | ✅       | mp3, wav, m4a — max `MAX_UPLOAD_SIZE_MB` (default 10 MB)         |
| `language` | string | ❌       | ISO-639-1 hint, e.g. `bn`, `en`. Omit (or send `auto`) to detect |

The model is fixed per deployment by the `HF_MODEL` environment variable and
cannot be overridden per request.

### The `language` field

Whisper detects the spoken language on its own, but an explicit hint helps when
audio is short, noisy, or mixes languages — and it forces the output script
(sending `zh` for English speech yields Chinese text).

- Accepts any of the **100 codes** listed by `GET /api/info`
  (`supportedLanguages`), which is Whisper's 99 languages plus Cantonese
  (`yue`) counted separately.
- Case and surrounding whitespace are normalised, so `" EN "` becomes `en`.
- `auto`, an empty value, or an omitted field all mean auto-detect.
- An unknown code is rejected with `400 UNSUPPORTED_LANGUAGE` before any
  upstream call, and the error `details.supportedLanguages` lists the valid set.

Internally the hint is forwarded to Hugging Face as
`parameters.generate_kwargs.language`. Passing `language` at the top level of
the payload is rejected by the ASR pipeline, so the server switches from a raw
binary body to a base64 JSON body whenever a hint is present.

**cURL**

```bash
# Auto-detect
curl -X POST http://localhost:5000/api/transcribe \
  -F "audio=@./sample.mp3"

# Force Bengali
curl -X POST http://localhost:5000/api/transcribe \
  -F "audio=@./sample.mp3" \
  -F "language=bn"
```

**200 OK**

```json
{
  "success": true,
  "data": {
    "text": "আপনার অডিওর প্রতিলিপি এখানে থাকবে…",
    "model": "openai/whisper-large-v3",
    "language": "bn",
    "characters": 3120,
    "words": 512,
    "file": { "name": "sample.mp3", "sizeBytes": 4128372, "format": "mp3" }
  },
  "meta": { "requestId": "9c2a…", "durationMs": 8241 }
}
```

`language` echoes the hint that was applied, or `"auto"` when the model
detected it.

**Error example — 413**

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File exceeds the 10 MB limit.",
    "details": { "limitBytes": 10485760, "receivedBytes": 41231872 }
  },
  "meta": { "requestId": "9c2a…" }
}
```

**Error example — 400 (bad language hint)**

```json
{
  "success": false,
  "error": {
    "code": "UNSUPPORTED_LANGUAGE",
    "message": "Language \"klingon\" is not supported. Omit the field to auto-detect.",
    "details": { "supportedLanguages": ["af", "am", "…", "zh"] }
  },
  "meta": { "requestId": "9c2a…" }
}
```

See the [full error-code table](./ARCHITECTURE.md#5-error-codes-stable-contract).

---

## Rate limiting

`RATE_LIMIT_MAX_REQUESTS` (default 20) requests per `RATE_LIMIT_WINDOW_MS`
(default 15 min) per IP on `/api/transcribe`. Exceeding it returns `429` with
`error.code = "RATE_LIMITED"` and a `Retry-After` header.
