# 🧩 BrowserExtensions

Browser-extension distributions of iNWebTools. Each extension is a thin client that
reuses the same `/api/transcribe` backend built in `../WebApplication/server`.

> ⏸️ **Phase 2 — not started.** All current development is in [`../WebApplication/`](../WebApplication). Work begins here only after the Web Application reaches v1.0.0.

## Planned targets

| Folder                      | Target browsers                                                           | Packaging                    |
| --------------------------- | ------------------------------------------------------------------------- | ---------------------------- |
| [`Android/`](./Android)     | Kiwi / Yandex / Firefox for Android (Manifest V3, mobile-optimised popup) | `.zip` / `.xpi`              |
| [`iPhone/`](./iPhone)       | Safari on iOS/iPadOS via **Safari Web Extension** (Xcode wrapper)         | `.ipa` via App Store Connect |
| [`HarmonyOS/`](./HarmonyOS) | HarmonyOS Browser / ArkWeb extension host                                 | `.hap`                       |

## Shared architecture (planned)

```
manifest.json          # MV3: permissions, action, background service worker
src/
  popup/               # Upload + transcript UI (reuses WebApplication design tokens)
  background/          # Service worker: API calls, auth, storage
  content/             # Capture <audio>/<video> sources on the current page
  options/             # API base URL, model, locale (bn/en) settings
assets/icons/          # 16/32/48/128 px
```

## Key design rules

- **No API key in the extension bundle.** The extension calls our backend, never Hugging Face directly.
- `host_permissions` must be the narrowest possible (our API origin only).
- All user-visible strings live in `_locales/bn/` and `_locales/en/` (bilingual parity, same as web).
- Store-listing screenshots go in [`../DevelopmentFiles/Screenshot/`](../DevelopmentFiles/Screenshot).
