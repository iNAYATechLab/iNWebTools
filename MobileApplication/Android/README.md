# iNWebTools — Android App

**Status:** ⏸️ Not started — see [`../../WebApplication/`](../../WebApplication) for active work.

## Target

- minSdk 26 (Android 8.0), targetSdk latest stable
- Kotlin + Jetpack Compose, Material 3, MVVM
- Retrofit/OkHttp → `POST /api/transcribe` (multipart)

## Planned structure

```
app/src/main/java/com/inwebtools/
  ui/          # Compose screens: Home, Recorder, Transcript
  data/        # Retrofit API client, repositories
  domain/      # Use cases, models
  di/          # Hilt modules
app/src/main/res/values/strings.xml      # English
app/src/main/res/values-bn/strings.xml   # বাংলা
```

## Notes

- Permissions: `RECORD_AUDIO` (optional), `INTERNET`. Use the photo/media picker
  instead of broad storage permissions.
- Enforce `MAX_UPLOAD_SIZE_MB` client-side.
- Build via Gradle → `.aab` for Play Store.
