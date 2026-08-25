# iNWebTools — iOS/iPadOS Safari Web Extension

**Status:** ⏸️ Not started — see [`../../WebApplication/`](../../WebApplication) for active work.

Safari Web Extension wrapped in an Xcode app project, distributed via the App Store.

## Planned structure

```
iNWebTools.xcodeproj/          # Xcode wrapper app
Shared (Extension)/
  Resources/manifest.json      # MV3-compatible Safari manifest
  Resources/popup/             # Upload + transcript UI
  SafariWebExtensionHandler.swift
iOS (App)/                     # Container app + onboarding
_locales/{bn,en}/
```

## Notes

- Requires macOS + Xcode 15+ and an Apple Developer account.
- Safari enforces stricter extension lifecycles — keep background work short.
- Verify App Store privacy labels: audio is uploaded to our server for processing.
