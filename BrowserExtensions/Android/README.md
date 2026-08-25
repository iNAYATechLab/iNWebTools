# iNWebTools — Android Browser Extension

**Status:** ⏸️ Not started — see [`../../WebApplication/`](../../WebApplication) for active work.

Manifest V3 extension for Chromium-based Android browsers (Kiwi, Yandex) and Firefox for Android.

## Planned structure

```
manifest.json          # MV3
src/popup/             # Mobile-first popup (compact upload + transcript)
src/background/        # Service worker → POST /api/transcribe
src/content/           # Detect <audio>/<video> on the page
_locales/{bn,en}/      # messages.json — bilingual parity
assets/icons/          # 16, 32, 48, 128 px
```

## Notes

- Popup must be usable at ≤ 360 px width.
- Request the narrowest `host_permissions` — our API origin only.
- Never bundle the Hugging Face token; the backend holds it.
