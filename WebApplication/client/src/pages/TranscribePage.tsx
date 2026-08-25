import { useCallback, useEffect, useRef, useState } from 'react';

import { AudioPlayer } from '../components/AudioPlayer';
import { AUDIO_LANGUAGE_EVENT } from '../components/widgets/QuickToolsWidget';
import { addHistoryEntry } from '../services/transcriptionHistory';
import { Dropzone } from '../components/Dropzone';
import { ErrorAlert } from '../components/ErrorAlert';
import { LanguageSelector } from '../components/LanguageSelector';
import { ProgressLoader } from '../components/ProgressLoader';
import { ResultBox } from '../components/ResultBox';
import { SparkleIcon, SpinnerIcon } from '../components/icons';
import { useLocale } from '../hooks/useLocale';
import { useTranscription } from '../hooks/useTranscription';
import type { AudioLanguage } from '../types';

/**
 * @param embedded True when rendered inside the widget grid, which already
 *   supplies the page's max-width and padding. Without this the component's
 *   own `mx-auto max-w-6xl` would fight the grid track and re-centre the
 *   transcriber independently of the sidebars.
 */
export function TranscribePage({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<AudioLanguage>('auto');
  const [clientError, setClientError] = useState<string | null>(null);

  const {
    phase,
    uploadPercent,
    result,
    durationMs,
    errorCode,
    isBusy,
    elapsedMs,
    start,
    cancel,
    reset,
  } = useTranscription();

  const handleSelect = useCallback(
    (next: File) => {
      setClientError(null);
      reset();
      setFile(next);
    },
    [reset],
  );

  const handleClear = useCallback(() => {
    setClientError(null);
    reset();
    setFile(null);
  }, [reset]);

  const handleSubmit = useCallback(() => {
    if (!file || isBusy) return;
    setClientError(null);
    void start(file, language);
  }, [file, isBusy, language, start]);

  /*
   * The Quick Tools widget lives in a sidebar with no parent relationship to
   * this component, so it publishes the chosen audio language on a window
   * event instead of calling down through props.
   */
  useEffect(() => {
    const onPick = (event: Event) => {
      const code = (event as CustomEvent<string>).detail;
      if (typeof code === 'string' && code) setLanguage(code as AudioLanguage);
    };
    window.addEventListener(AUDIO_LANGUAGE_EVENT, onPick);
    return () => window.removeEventListener(AUDIO_LANGUAGE_EVENT, onPick);
  }, []);

  /*
   * Record a finished transcription for the Recent Transcriptions widget.
   *
   * Keyed on the result object identity via a ref rather than firing inside
   * the submit handler: `start` resolves asynchronously and the result lands
   * in state, so this is the only place that reliably sees a *completed* run
   * exactly once — including when the user retries after an error.
   */
  const recordedRef = useRef<unknown>(null);
  useEffect(() => {
    if (!result || recordedRef.current === result) return;
    recordedRef.current = result;

    addHistoryEntry({
      fileName: result.file.name,
      characters: result.characters,
      words: result.words,
      language,
      text: result.text,
    });
  }, [result, language]);

  return (
    <main
      className={
        embedded ? 'w-full flex-1' : 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12'
      }
    >
      {/* Hero */}
      <section className="mb-8 text-center sm:mb-12">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/10 px-3.5 py-1.5 text-xs font-medium text-brand-200">
          <SparkleIcon className="h-3.5 w-3.5" />
          {t.header.poweredBy}
        </span>
        <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          {t.hero.title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
          {t.hero.description}
        </p>
      </section>

      {/*
        Two-column workspace: input on the left, transcript on the right.
        When embedded between sidebars the split is deferred to `2xl`: at `lg`
        the middle track is too narrow for two usable columns and the dropzone
        ends up unusably cramped.
      */}
      <div className={`grid gap-5 lg:gap-6 ${embedded ? '2xl:grid-cols-2' : 'lg:grid-cols-2'}`}>
        <div className="space-y-5">
          <Dropzone
            file={file}
            disabled={isBusy}
            onSelect={handleSelect}
            onClear={handleClear}
            onError={setClientError}
          />

          {clientError && (
            <ErrorAlert message={clientError} onDismiss={() => setClientError(null)} />
          )}

          {file && <AudioPlayer file={file} />}

          {file && <LanguageSelector value={language} onChange={setLanguage} disabled={isBusy} />}

          {file && !isBusy && (
            <button
              type="button"
              onClick={handleSubmit}
              className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:shadow-xl hover:shadow-brand-500/30 active:scale-[0.99]"
            >
              <SparkleIcon className="h-4 w-4 transition-transform group-hover:rotate-12" />
              {t.actions.transcribe}
            </button>
          )}

          {isBusy && (
            <ProgressLoader
              phase={phase}
              uploadPercent={uploadPercent}
              elapsedMs={elapsedMs}
              onCancel={cancel}
            />
          )}

          {errorCode && (
            <ErrorAlert
              code={errorCode}
              onRetry={errorCode === 'CANCELLED' ? undefined : handleSubmit}
            />
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <ResultBox result={result} durationMs={durationMs} />

          {result && (
            <button
              type="button"
              onClick={handleClear}
              className="mt-4 w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              {t.actions.reset}
            </button>
          )}
        </div>
      </div>

      {/* Screen-reader-only live status */}
      <p className="sr-only" aria-live="polite">
        {isBusy ? t.actions.transcribing : phase === 'done' ? t.result.title : ''}
        {isBusy && <SpinnerIcon className="hidden" />}
      </p>
    </main>
  );
}
