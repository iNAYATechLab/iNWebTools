import { useEffect, useRef, useState } from 'react';

interface VideoPlayerPreviewProps {
  videoUrl?: string | null;
  watermarkText?: string;
  watermarkPosition?: string;
  watermarkOpacity?: number;
  playbackSpeed?: number;
}

export function VideoPlayerPreview({
  videoUrl,
  watermarkText,
  watermarkPosition = 'bottom-right',
  watermarkOpacity = 50,
  playbackSpeed = 1,
}: VideoPlayerPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(45);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      void videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getWatermarkPositionClass = () => {
    switch (watermarkPosition) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-12 left-4';
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'bottom-right':
      default:
        return 'bottom-12 right-4';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-xl">
      {videoUrl ? (
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={() => {
              if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) setDuration(videoRef.current.duration || 45);
            }}
            onEnded={() => setIsPlaying(false)}
            className="h-full w-full object-contain"
          />

          {/* Watermark Preview Overlay */}
          {watermarkText && (
            <div
              className={`absolute pointer-events-none rounded-lg bg-black/40 px-3 py-1.5 font-bold text-white backdrop-blur-xs text-xs tracking-wide shadow-md ${getWatermarkPositionClass()}`}
              style={{ opacity: watermarkOpacity / 100 }}
            >
              {watermarkText}
            </div>
          )}
        </div>
      ) : (
        <div className="relative aspect-video w-full bg-slate-900/80 flex flex-col items-center justify-center text-center p-6 border-b border-white/5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 mb-2">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-xs font-medium text-slate-300">Video Canvas Ready</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Upload a video to preview playback, trimming, and effects.
          </p>
        </div>
      )}

      {/* Player Controls Bar */}
      <div className="space-y-2 p-3 bg-slate-950 border-t border-white/5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!videoUrl}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-400 transition-colors disabled:opacity-40"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            disabled={!videoUrl}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-brand-500"
          />

          <span className="font-mono text-[11px] text-slate-300 whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            type="button"
            onClick={toggleMute}
            disabled={!videoUrl}
            className="rounded p-1 text-slate-400 hover:text-white transition-colors"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </div>
  );
}
