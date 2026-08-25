# 📱 MobileApplication

Native / cross-platform mobile clients for iNWebTools. Each app talks to the same
`/api/transcribe` REST contract documented in [`../DevelopmentFiles/docs/API.md`](../DevelopmentFiles/docs/API.md).

> ⏸️ **Phase 3 — not started.** All current development is in [`../WebApplication/`](../WebApplication). Work begins here only after the Web Application reaches v1.0.0.

## Planned targets

| Folder                      | Platform               | Toolchain                                              | Artifact        |
| --------------------------- | ---------------------- | ------------------------------------------------------ | --------------- |
| [`Android/`](./Android)     | Android 8.0+ (API 26+) | Kotlin + Jetpack Compose (or React Native shared core) | `.aab` / `.apk` |
| [`iPhone/`](./iPhone)       | iOS 15+                | Swift + SwiftUI                                        | `.ipa`          |
| [`HarmonyOS/`](./HarmonyOS) | HarmonyOS NEXT         | ArkTS + ArkUI (DevEco Studio)                          | `.app` / `.hap` |

## Shared feature set

- Pick audio from device storage **or** record in-app
- Local playback with seek + speed control before/after transcription
- Model selector (allow-listed by the backend) and language hint
- Transcript: copy, share, export `.txt`
- Bilingual UI — বাংলা / English, following the device locale by default
- Offline queue: retry a failed upload when connectivity returns

## Key design rules

- **No Hugging Face token on device.** All inference goes through our backend.
- Enforce the same upload cap client-side (`MAX_UPLOAD_SIZE_MB`) to fail fast.
- Map backend `error.code` values to localised messages — see the
  [error-code contract](../DevelopmentFiles/docs/ARCHITECTURE.md#5-error-codes-stable-contract).
- Store-listing screenshots go in [`../DevelopmentFiles/Screenshot/`](../DevelopmentFiles/Screenshot).
