# iNWebTools — iOS App

**Status:** ⏸️ Not started — see [`../../WebApplication/`](../../WebApplication) for active work.

## Target

- iOS 15+, Swift 5.9, SwiftUI, MVVM
- `URLSession` multipart upload → `POST /api/transcribe`

## Planned structure

```
iNWebTools.xcodeproj/
iNWebTools/
  Views/       # SwiftUI: HomeView, RecorderView, TranscriptView
  ViewModels/
  Services/    # APIClient, AudioRecorder, FileValidator
  Resources/
    en.lproj/Localizable.strings
    bn.lproj/Localizable.strings
```

## Notes

- `Info.plist`: `NSMicrophoneUsageDescription` (bn + en localised).
- Use `AVAudioPlayer` for playback, `AVAudioRecorder` for capture.
- Background upload via `URLSessionConfiguration.background` for large files.
