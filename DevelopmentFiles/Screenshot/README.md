# 🖼️ Screenshot

Product screenshots used in the READMEs, documentation and app-store listings.
Shared by all phases — Web Application first, then extensions and mobile apps.

| Folder                                      | Viewport         | Suggested capture size                          |
| ------------------------------------------- | ---------------- | ----------------------------------------------- |
| [`DesktopScreenshot/`](./DesktopScreenshot) | Desktop / laptop | 1920 × 1080 or 2560 × 1440                      |
| [`TabletScreenshot/`](./TabletScreenshot)   | Tablet           | 1536 × 2048 (portrait), 2048 × 1536 (landscape) |
| [`MobileScreenshot/`](./MobileScreenshot)   | Phone            | 1170 × 2532 (iPhone), 1080 × 2400 (Android)     |

## Naming convention

```
<platform>-<screen>-<state>-<locale>.png

desktop-home-empty-bn.png
desktop-upload-dragover-en.png
mobile-transcript-success-bn.png
tablet-player-playing-en.png
```

## Capture checklist

- [ ] Both locales (`bn` and `en`) for every key screen
- [ ] Empty state, drag-over state, uploading/progress, success, and error state
- [ ] No real API keys, tokens, personal audio or email addresses visible
- [ ] PNG for UI (lossless); optimise with `pngquant` / `oxipng` before committing
- [ ] Keep individual files under ~500 KB
