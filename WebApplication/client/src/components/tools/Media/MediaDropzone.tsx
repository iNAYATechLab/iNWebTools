import React, { useRef, useState } from 'react';

interface MediaDropzoneProps {
  acceptedFormats?: string[];
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  rawText?: string;
  onRawTextChange?: (text: string) => void;
  supportsVoiceRecord?: boolean;
  supportsSubtitleEdit?: boolean;
}

export function MediaDropzone({
  acceptedFormats = ['.mp3', '.wav', '.m4a', '.mp4', '.mov', '.webm'],
  multiple = false,
  files,
  onFilesChange,
  rawText = '',
  onRawTextChange,
  supportsVoiceRecord = false,
  supportsSubtitleEdit = false,
}: MediaDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'subtitles'>('upload');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      if (multiple) {
        onFilesChange([...files, ...dropped]);
      } else {
        onFilesChange([dropped[0]!]);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      if (multiple) {
        onFilesChange([...files, ...selected]);
      } else {
        onFilesChange([selected[0]!]);
      }
    }
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const recordedFile = new File([blob], `recorded-voice-${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        onFilesChange([recordedFile]);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('Microphone access was denied or is not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Mode Navigation Tabs */}
      {(supportsVoiceRecord || supportsSubtitleEdit) && (
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Source Mode
          </span>
          <div className="flex rounded-lg bg-white/5 p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Upload Media
            </button>
            {supportsVoiceRecord && (
              <button
                type="button"
                onClick={() => setActiveTab('record')}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  activeTab === 'record'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎙️ Record Mic
              </button>
            )}
            {supportsSubtitleEdit && (
              <button
                type="button"
                onClick={() => setActiveTab('subtitles')}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  activeTab === 'subtitles'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📝 Subtitle Code
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'upload' ? (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
              isDragOver
                ? 'border-brand-400 bg-brand-500/10 scale-[1.01]'
                : 'border-white/15 bg-white/[0.02] hover:border-brand-400/50 hover:bg-white/[0.04]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept={acceptedFormats.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600/30 to-brand-400/20 text-brand-400 ring-1 ring-brand-400/30 group-hover:scale-110 group-hover:text-brand-300 transition-transform">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <p className="text-sm font-semibold text-white">
              <span className="text-brand-400 underline decoration-brand-400/40 underline-offset-4 group-hover:decoration-brand-400">
                Choose Audio or Video
              </span>{' '}
              or drag & drop
            </p>

            <p className="mt-1.5 text-xs text-slate-400">
              Supports {acceptedFormats.slice(0, 6).join(', ')}
              {acceptedFormats.length > 6 ? ` +${acceptedFormats.length - 6} more` : ''} (Up to 25
              MB)
            </p>

            {multiple && (
              <span className="mt-3 inline-flex items-center rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-300 ring-1 ring-inset ring-brand-500/20">
                Multi-track joiner mode enabled
              </span>
            )}
          </div>

          {/* Uploaded File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Selected {files.length === 1 ? 'file' : `${files.length} files`}</span>
                <button
                  type="button"
                  onClick={() => onFilesChange([])}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-xs text-slate-200"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="rounded bg-brand-500/20 p-1.5 text-brand-400 font-mono text-[10px] uppercase">
                        {file.name.split('.').pop() || 'MEDIA'}
                      </span>
                      <div className="truncate">
                        <p className="truncate font-medium text-slate-200">{file.name}</p>
                        <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onFilesChange(files.filter((_, i) => i !== idx))}
                      className="rounded-lg p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'record' ? (
        /* Live Voice Recorder */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-slate-950/80 p-8 text-center space-y-4">
          <div className="relative">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-xl transition-transform ${
                isRecording
                  ? 'bg-red-500 animate-pulse scale-110 shadow-red-500/40'
                  : 'bg-brand-500 hover:bg-brand-400 hover:scale-105 shadow-brand-500/30'
              }`}
            >
              {isRecording ? (
                <div className="h-6 w-6 rounded bg-white" />
              ) : (
                <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              )}
            </button>
          </div>

          <div>
            <span className="font-mono text-xl font-bold text-white">
              {formatTimer(recordingDuration)}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              {isRecording
                ? '🔴 Recording in progress... Click to stop.'
                : 'Click the microphone button to start recording.'}
            </p>
          </div>
        </div>
      ) : (
        /* Subtitle Text Mode */
        <div className="space-y-2">
          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => onRawTextChange?.(e.target.value)}
            placeholder="Paste SubRip (.srt) or WebVTT (.vtt) text content here..."
            className="w-full rounded-xl border border-white/15 bg-slate-950/80 p-3.5 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
          <p className="text-[11px] text-slate-400">
            Paste raw subtitle timestamps and cue lines directly.
          </p>
        </div>
      )}
    </div>
  );
}
