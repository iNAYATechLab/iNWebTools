import { useCallback, useId, useRef, useState } from 'react';

import { useLocale } from '../hooks/useLocale';
import { formatBytes, interpolate } from '../utils/format';
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_MB, validateAudioFile } from '../utils/validateAudio';
import { CloseIcon, FileAudioIcon, UploadIcon } from './icons';

type DropzoneProps = {
  file: File | null;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onClear: () => void;
  onError: (message: string) => void;
};

export function Dropzone({ file, disabled = false, onSelect, onClear, onError }: DropzoneProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  // Nested dragenter/dragleave events fire constantly; count them instead of toggling.
  const dragDepth = useRef(0);

  const accept = useCallback(
    (candidate: File | undefined) => {
      if (!candidate) return;
      const check = validateAudioFile(candidate);

      if (!check.ok) {
        onError(
          check.reason === 'size'
            ? interpolate(t.errors.clientTooLarge, { size: formatBytes(check.sizeBytes) })
            : interpolate(t.errors.clientBadType, { name: check.fileName }),
        );
        return;
      }
      onSelect(candidate);
    },
    [onError, onSelect, t],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      if (disabled) return;
      accept(event.dataTransfer.files?.[0]);
    },
    [accept, disabled],
  );

  const openPicker = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  /* ------------------------- selected-file state ------------------------- */
  if (file) {
    return (
      <div className="a2t-card p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
            <FileAudioIcon className="h-6 w-6" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {t.upload.selected}
            </p>
            <p className="truncate text-sm font-semibold text-white" title={file.name}>
              {file.name}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{formatBytes(file.size)}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              {t.upload.change}
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              aria-label={t.upload.remove}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    );
  }

  /* ---------------------------- empty state ----------------------------- */
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={t.upload.title}
      aria-disabled={disabled}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current += 1;
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) setIsDragging(false);
      }}
      onDrop={handleDrop}
      className={`group relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 ${
        disabled
          ? 'cursor-not-allowed border-white/10 opacity-50'
          : isDragging
            ? 'scale-[1.01] border-brand-400 bg-brand-500/10 shadow-xl shadow-brand-500/10'
            : 'border-white/15 bg-white/[0.02] hover:border-brand-400/60 hover:bg-brand-500/[0.06]'
      }`}
    >
      <span
        className={`grid h-16 w-16 place-items-center rounded-2xl transition-all duration-200 ${
          isDragging
            ? 'scale-110 bg-brand-500 text-white'
            : 'bg-white/5 text-brand-300 group-hover:bg-brand-500/20'
        }`}
      >
        <UploadIcon className="h-7 w-7" />
      </span>

      <div>
        <p className="text-base font-semibold text-white">
          {isDragging ? t.upload.dropHere : t.upload.dragDrop}{' '}
          {!isDragging && (
            <span className="text-brand-400 underline underline-offset-4">{t.upload.browse}</span>
          )}
        </p>
        <p className="mt-1.5 text-sm text-slate-400">{t.upload.formats}</p>
      </div>

      {/* 10 MB limit indicator */}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 text-amber-400"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.2" r="1.1" fill="currentColor" />
        </svg>
        {t.upload.maxSize}
        <span className="text-slate-500">({MAX_UPLOAD_MB} MB)</span>
      </span>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
