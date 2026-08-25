/**
 * Quick Tools & Language widget.
 *
 * Two different "languages" appear here and conflating them is a real trap:
 *   - the *interface* locale (Bengali/English chrome), owned by LocaleContext
 *   - the *audio* language hint sent to the ASR model
 *
 * They are labelled separately for that reason. The audio shortcuts publish
 * their choice on a window event rather than reaching into the transcriber's
 * state: the widget is rendered by the sidebar renderer and has no parent
 * relationship to TranscribePage, so an event is the honest way to cross that
 * gap without threading a context through the whole widget engine.
 */

import { useCallback, useState } from 'react';

import { useLocale } from '../../hooks/useLocale';
import { findLanguage } from '../../i18n/languages';
import type { WidgetInstance } from '../../types/widgets';
import { WidgetShell } from './WidgetShell';

/** Fired when a shortcut is tapped; TranscribePage listens. */
export const AUDIO_LANGUAGE_EVENT = 'inwebtools:audio-language';

export function QuickToolsWidget({ widget }: { widget: WidgetInstance }) {
  const { locale, toggleLocale, t } = useLocale();
  const [copied, setCopied] = useState(false);

  const showLocaleToggle = Boolean(widget.settings.showLocaleToggle);
  const showAudioLanguages = Boolean(widget.settings.showAudioLanguages);
  const showCopyLink = Boolean(widget.settings.showCopyLink);
  const codes = String(widget.settings.languageCodes ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 8);

  const pickLanguage = useCallback((code: string) => {
    window.dispatchEvent(new CustomEvent(AUDIO_LANGUAGE_EVENT, { detail: code }));
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is permission-gated and unavailable over plain http on some
      // browsers. Failing silently is right: this is a convenience button.
    }
  }, []);

  return (
    <WidgetShell title={widget.title}>
      {showLocaleToggle && (
        <div className="mb-3">
          <p className="mb-1.5 text-[11px] text-slate-500">Interface language</p>
          <button
            type="button"
            onClick={toggleLocale}
            className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10"
          >
            {t.meta.label} → {locale === 'bn' ? 'English' : 'বাংলা'}
          </button>
        </div>
      )}

      {showAudioLanguages && codes.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[11px] text-slate-500">Audio language</p>
          <div className="flex flex-wrap gap-1.5">
            {codes.map((code) => {
              const language = findLanguage(code);
              const label =
                code === 'auto' ? t.language.auto : (language?.native ?? code.toUpperCase());
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => pickLanguage(code)}
                  className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showCopyLink && (
        <button
          type="button"
          onClick={() => void copyLink()}
          className="w-full rounded-lg border border-white/10 px-3 py-2 text-[11px] text-slate-400 transition-colors hover:border-white/20 hover:text-slate-200"
        >
          {copied ? '✓ Link copied' : 'Copy page link'}
        </button>
      )}
    </WidgetShell>
  );
}
