# iNWebTools — HarmonyOS App

**Status:** ⏸️ Not started — see [`../../WebApplication/`](../../WebApplication) for active work.

## Target

- HarmonyOS NEXT, ArkTS + ArkUI, DevEco Studio
- `@ohos.net.http` / `request.uploadFile` → `POST /api/transcribe`

## Planned structure

```
entry/src/main/ets/
  pages/       # Index, Recorder, Transcript
  viewmodel/
  common/      # ApiClient, validators
entry/src/main/resources/
  base/element/string.json   # default (en)
  bn/element/string.json     # বাংলা
module.json5                 # abilities, permissions
```

## Notes

- Permissions: `ohos.permission.INTERNET`, `ohos.permission.MICROPHONE`.
- Packaged as `.hap`; distributed through Huawei AppGallery.
- Reuse the same error-code → message mapping as the web client.
