# iNWebTools — HarmonyOS Browser Extension

**Status:** ⏸️ Not started — see [`../../WebApplication/`](../../WebApplication) for active work.

Extension for the HarmonyOS Browser / ArkWeb extension host.

## Planned structure

```
manifest.json / module.json5   # HarmonyOS extension descriptor
src/popup/                     # ArkTS or web-based popup
src/background/                # API calls to /api/transcribe
resources/{base,bn,en}/        # Bilingual string resources
```

## Notes

- Built with DevEco Studio; packaged as `.hap`.
- ArkWeb extension APIs differ from Chromium MV3 — keep a shared core module
  and platform-specific adapters.
- Distributed through Huawei AppGallery.
