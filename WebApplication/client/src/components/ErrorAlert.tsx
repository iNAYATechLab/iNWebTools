import { useLocale } from '../hooks/useLocale';
import { messageForCode } from '../i18n/errorMessages';
import { AlertIcon, CloseIcon } from './icons';

type Props = {
  /** Error code from the API, or a ready-made message for client-side validation. */
  code?: string | null;
  message?: string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
};

export function ErrorAlert({ code, message, onDismiss, onRetry }: Props) {
  const { t } = useLocale();
  if (!code && !message) return null;

  const text = message ?? messageForCode(t, code as string);

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3"
    >
      <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-rose-200">{t.errors.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-rose-100/80">{text}</p>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-lg border border-rose-400/30 px-2.5 py-1 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/15"
          >
            {t.actions.tryAgain}
          </button>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t.upload.remove}
          className="shrink-0 rounded-lg p-1 text-rose-300/70 transition-colors hover:bg-rose-500/15 hover:text-rose-200"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
