import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, transcribe } from '../services/api';
import type { AudioLanguage, TranscriptionPhase, TranscriptionResult } from '../types';

type State = {
  phase: TranscriptionPhase;
  uploadPercent: number;
  result: TranscriptionResult | null;
  durationMs: number | null;
  errorCode: string | null;
};

const INITIAL: State = {
  phase: 'idle',
  uploadPercent: 0,
  result: null,
  durationMs: null,
  errorCode: null,
};

/**
 * Owns the transcription request lifecycle: progress, cancellation, results and
 * error codes. Components stay presentational.
 */
export function useTranscription() {
  const [state, setState] = useState<State>(INITIAL);
  const [elapsedMs, setElapsedMs] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // Live "elapsed" counter while a request is in flight.
  const isBusy =
    state.phase === 'uploading' || state.phase === 'processing' || state.phase === 'finalizing';

  useEffect(() => {
    if (!isBusy) return undefined;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 100);
    return () => window.clearInterval(id);
  }, [isBusy]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL);
    setElapsedMs(0);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const start = useCallback(async (file: File, language: AudioLanguage) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setState({ ...INITIAL, phase: 'uploading' });

    try {
      const { result, durationMs } = await transcribe({
        file,
        language,
        signal: controller.signal,
        onUploadProgress: (percent) => {
          if (!mountedRef.current) return;
          setState((s) => (s.phase === 'uploading' ? { ...s, uploadPercent: percent } : s));
        },
        onUploadComplete: () => {
          if (!mountedRef.current) return;
          setState((s) => ({ ...s, phase: 'processing', uploadPercent: 100 }));
        },
        onResponseStart: () => {
          if (!mountedRef.current) return;
          // Only advance from 'processing': a fast server can send headers
          // before the upload 'load' event, which would rewind the checklist.
          setState((s) => (s.phase === 'processing' ? { ...s, phase: 'finalizing' } : s));
        },
      });

      if (!mountedRef.current) return;
      setState({
        phase: 'done',
        uploadPercent: 100,
        result,
        durationMs: durationMs ?? Date.now() - startedAtRef.current,
        errorCode: null,
      });
    } catch (error) {
      if (!mountedRef.current) return;
      const code = error instanceof ApiError ? error.code : 'UNKNOWN';
      setState({ ...INITIAL, errorCode: code });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  return {
    ...state,
    isBusy,
    elapsedMs,
    start,
    cancel,
    reset,
  };
}
