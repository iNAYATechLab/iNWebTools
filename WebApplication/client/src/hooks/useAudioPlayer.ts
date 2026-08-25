import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Drives a hidden <audio> element for the preview player.
 *
 * The object URL is created and revoked here, which prevents the classic
 * memory leak of leaving blob URLs alive after the file changes.
 */
export function useAudioPlayer(file: File | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);

  // Create/revoke the blob URL alongside the file.
  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Keep playback rate in sync.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate, objectUrl]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  /** Props to spread onto the <audio> element. */
  const audioProps = {
    ref: audioRef,
    src: objectUrl ?? undefined,
    preload: 'metadata' as const,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onEnded: () => {
      setIsPlaying(false);
      setCurrentTime(0);
    },
    onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      setCurrentTime(e.currentTarget.currentTime),
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const value = e.currentTarget.duration;
      setDuration(Number.isFinite(value) ? value : 0);
    },
  };

  return {
    audioProps,
    isPlaying,
    currentTime,
    duration,
    rate,
    setRate,
    toggle,
    seek,
    hasAudio: Boolean(objectUrl),
  };
}
