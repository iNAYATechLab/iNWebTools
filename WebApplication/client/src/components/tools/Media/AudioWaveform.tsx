import React, { useEffect, useRef, useState } from 'react';

interface AudioWaveformProps {
  audioUrl?: string | null;
  peaks?: number[];
  interactive?: boolean;
  trimStart?: string;
  trimEnd?: string;
  onTrimChange?: (start: string, end: string) => void;
  playbackSpeed?: number;
}

export function AudioWaveform({
  audioUrl,
  peaks = [],
  trimStart = '00:00',
  trimEnd = '01:30',
  playbackSpeed = 1,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(90);

  // Generate synthetic waveform if none provided
  const waveformPeaks =
    peaks.length > 0
      ? peaks
      : Array.from({ length: 64 }).map((_, i) =>
          Number(
            Math.min(
              1,
              Math.max(0.15, Math.abs(Math.sin(i * 0.2) * 0.7 + Math.cos(i * 0.45) * 0.3)),
            ).toFixed(2),
          ),
        );

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / waveformPeaks.length;
    const progressPercent = duration > 0 ? currentTime / duration : 0;

    waveformPeaks.forEach((peak, i) => {
      const barHeight = peak * (height - 16);
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      // Played vs unplayed bar gradient
      if (i / waveformPeaks.length <= progressPercent) {
        ctx.fillStyle = '#38bdf8'; // Played (cyan/brand)
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Unplayed
      }

      ctx.beginPath();
      ctx.roundRect(x + 1, y, Math.max(1, barWidth - 2), barHeight, 2);
      ctx.fill();
    });
  }, [waveformPeaks, currentTime, duration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 90);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/80 p-4">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-md shadow-brand-500/20 hover:bg-brand-400 transition-colors"
          >
            {isPlaying ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <span className="font-mono text-xs font-semibold text-slate-200">
            {formatSeconds(currentTime)} / {formatSeconds(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
          <span>Speed: {playbackSpeed}x</span>
          <span>·</span>
          <span>
            Trim: [{trimStart} - {trimEnd}]
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-slate-900/90 p-2 cursor-pointer border border-white/5">
        <canvas
          ref={canvasRef}
          width={600}
          height={68}
          onClick={handleCanvasClick}
          className="h-16 w-full"
        />
      </div>
    </div>
  );
}
