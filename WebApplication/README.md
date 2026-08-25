# 🎙️ iNWebTools — Web Application

> Upload an audio file (MP3/WAV/M4A/OGG/FLAC/WebM), play it back, and get an accurate
> transcript powered by Hugging Face Whisper models — with a bilingual (বাংলা / English) UI.

<p align="left">
  <img alt="Node" src="https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

---

## 📌 Project Status

| Step  | Scope                                                        | Status      |
| ----- | ------------------------------------------------------------ | ----------- |
| **1** | Environment, GitHub & file-structure setup                   | ✅ **Done** |
| 2     | Node.js/Express backend + Hugging Face API logic             | ⏳ Planned  |
| 3     | React frontend UI, drag-and-drop uploader & audio player     | ⏳ Planned  |
| 4     | Local server install/run, testing, security & error handling | ⏳ Planned  |
| 5     | ZIP release automation                                       | ⏳ Planned  |

---

## 🧱 Tech Stack

| Layer    | Technology                                                                |
| -------- | ------------------------------------------------------------------------- |
| Frontend | React 18, Vite 5, TypeScript 5, CSS Modules, i18n (bn/en)                 |
| Backend  | Node.js 20, Express 4, JavaScript (ESM), Multer, node-fetch               |
| AI / ASR | Hugging Face Inference API — `whisper-large-v3` (configurable)            |
| Security | Helmet, CORS allow-list, express-rate-limit, MIME + magic-byte validation |
| Quality  | ESLint (flat config), Prettier, Vitest, Husky + lint-staged               |
| CI/CD    | GitHub Actions (lint → typecheck → test → build → release ZIP)            |

---

## 🌐 Languages & scripts

Two different things are configurable, and they are independent:

| What               | How many | Notes                                          |
| ------------------ | -------- | ---------------------------------------------- |
| Interface language | 2        | বাংলা / English, toggled in the header         |
| Spoken audio       | 100      | Whisper's 99 languages, plus Cantonese (`yue`) |

**Each language is transcribed in its own script.** Bengali audio produces
Bengali characters, Chinese produces Chinese characters, Arabic produces Arabic
characters. This is transcription, not translation — the words are never
converted to another language or romanised.

Detection is automatic; the language selector is only a hint for difficult
audio (short clips, background noise, or two languages in one file). Setting it
also forces the output script.

### Why `whisper-large-v3` and not `-turbo`

The turbo variant is 2–4x faster and was the original default, but its pruned
decoder is unreliable on low-resource languages. Measured on real Bengali
speech:

| Model            | Bengali script | Output                           |
| ---------------- | -------------- | -------------------------------- |
| `large-v3-turbo` | 0 %            | Gujarati script, repetition loop |
| `large-v3`       | 96 %           | Correct, readable Bengali        |

Since correct script output is the core requirement, accuracy wins over speed.
`HF_MODEL` still accepts the turbo model if a deployment only handles
high-resource languages and wants the extra speed.

---

## 📂 Directory Structure

```
WebApplication/
├── client/                      # React + Vite + TypeScript SPA (Step 3)
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts           # dev proxy /api -> :5000, "@" alias
│   └── src/
│       ├── assets/              # Icons, images, fonts
│       ├── components/          # Dropzone, AudioPlayer, TranscriptPanel…
│       ├── hooks/               # useTranscription, useAudioPlayer, useLocale…
│       ├── i18n/                # bn.json / en.json + provider
│       ├── pages/               # Route-level views
│       ├── services/            # API client (fetch wrapper)
│       ├── styles/              # Design tokens, global CSS
│       ├── types/               # Shared TS types
│       └── utils/               # Formatters, validators
│
├── server/                      # Node.js + Express + TypeScript API (Step 2)
│   ├── src/
│   │   ├── config/              # env loading & validation (Zod)
│   │   ├── controllers/         # Request handlers
│   │   ├── middlewares/         # upload, errorHandler, rateLimit, notFound
│   │   ├── routes/              # /api/health, /api/models, /api/transcribe
│   │   ├── services/            # huggingface.service.ts
│   │   ├── types/               # API contracts
│   │   └── utils/               # logger, ApiError, asyncHandler
│   ├── tests/                   # Vitest unit/integration tests
│   └── tmp/                     # Ephemeral upload buffer (git-ignored)
│
├── .env.example                 # Copy → .env
├── .nvmrc                       # Node 20
├── eslint.config.js
├── tsconfig.base.json
└── package.json                 # npm workspaces root (server + client)
```

> **Note:** this folder holds only what the running application needs.
> Documentation, release scripts, design sources and QA assets live in
> [`../DevelopmentFiles/`](../DevelopmentFiles). Sibling folders
> `../BrowserExtensions/` and `../MobileApplication/` are later phases that
> consume this server's REST API.

## 🚀 Quick Start

> Full install/run instructions land in **Step 4**. The commands below are the target workflow.

```bash
# 1) Clone and enter the Web Application
git clone https://github.com/iNAYATechLab/inwebtools.git
cd inwebtools/WebApplication

# 2) Use the pinned Node version
nvm use            # reads .nvmrc (Node 20)

# 3) Configure environment
cp .env.example .env
#    → open .env and paste your Hugging Face token (HF_FREE_API_TOKEN)

# 4) Install all workspaces
npm install

# 5) Run backend (:5000) + frontend (:5173) together
npm run dev
```

Open <http://localhost:5173>.

---

## 🔑 Getting a Hugging Face API Key

1. Create a free account at <https://huggingface.co/join>.
2. Go to **Settings → Access Tokens** → <https://huggingface.co/settings/tokens>.
3. Create a token with the **read** role.
4. Paste it into `.env` as `HF_FREE_API_TOKEN=hf_…`.

The token is **only** used server-side. It is never exposed to the browser bundle.

---

## ⚙️ Environment Variables

See [`.env.example`](./.env.example) for the annotated master list. Highlights:

| Variable                  | Default                   | Purpose                              |
| ------------------------- | ------------------------- | ------------------------------------ |
| `PORT`                    | `5000`                    | Express listen port                  |
| `HUGGINGFACE_API_KEY`     | —                         | **Required.** HF inference token     |
| `HF_MODEL`                | `openai/whisper-large-v3` | Transcription model (per deployment) |
| `ASR_ALLOWED_MODELS`      | 3 whisper models          | Allow-list the client may pick from  |
| `MAX_UPLOAD_SIZE_MB`      | `25`                      | Hard upload cap                      |
| `CORS_ORIGIN`             | `http://localhost:5173`   | Allowed browser origin               |
| `RATE_LIMIT_MAX_REQUESTS` | `30` / 15 min             | Abuse protection                     |
| `VITE_DEFAULT_LOCALE`     | `bn`                      | Initial UI language (`bn` \| `en`)   |

---

## 📜 NPM Scripts (root)

| Script                            | Description                                  |
| --------------------------------- | -------------------------------------------- |
| `npm run dev`                     | Run server + client concurrently             |
| `npm run build`                   | Type-check and build both workspaces         |
| `npm start`                       | Run the compiled production server           |
| `npm run lint` / `lint:fix`       | ESLint across the monorepo                   |
| `npm run format` / `format:check` | Prettier                                     |
| `npm run typecheck`               | `tsc --noEmit` in both workspaces            |
| `npm test`                        | Vitest suite                                 |
| `npm run release:zip`             | Build + package a distributable ZIP (Step 5) |

---

## 📚 Documentation

- [`ARCHITECTURE.md`](../DevelopmentFiles/docs/ARCHITECTURE.md) — system design, data flow, decisions
- [`API.md`](../DevelopmentFiles/docs/API.md) — REST contract for `/api/*`
- [`ROADMAP.md`](../DevelopmentFiles/docs/ROADMAP.md) — the 5-step delivery plan
- [`CONTRIBUTING.md`](../DevelopmentFiles/CONTRIBUTING.md) — branching, commits, PR rules

---

## 🛡️ Security Notes

- API key stays server-side; the SPA talks only to our own `/api` proxy.
- Uploads are size-capped, MIME- and magic-byte-validated, stored in a temp dir and deleted after inference.
- `helmet` sets hardened HTTP headers; CORS is an explicit allow-list, not `*`.
- Rate limiting protects the paid inference endpoint.

---

## 📄 License

[MIT](../LICENSE) © iNWebTools
