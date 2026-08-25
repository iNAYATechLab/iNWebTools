import { useMemo, useState } from 'react';
import { useLocale } from '../hooks/useLocale';
import { POPULAR_LANGUAGES, SORTED_LANGUAGES, findLanguage } from '../i18n/languages';
import type { AudioLanguage } from '../types';
import { SparkleIcon } from './icons';

type Props = {
  value: AudioLanguage;
  onChange: (next: AudioLanguage) => void;
  disabled?: boolean;
};

/**
 * Which spoken language the model should expect. Not the UI language.
 *
 * Auto-detect plus a shortlist stay one tap away; the remaining languages live
 * behind a searchable list so the common case is not buried in 99 options.
 */
export function LanguageSelector({ value, onChange, disabled = false }: Props) {
  const { t, locale } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  const quickPicks = useMemo(
    () => [
      { code: 'auto', primary: t.language.auto, secondary: 'Auto' },
      ...POPULAR_LANGUAGES.map((l) => ({
        code: l.code,
        primary: l.native,
        secondary: locale === 'bn' ? l.bn : l.en,
      })),
    ],
    [t, locale],
  );

  // A language picked from the long list should stay visible even when the
  // panel is closed, so surface it as an extra chip.
  const selectedExtra =
    value !== 'auto' && !POPULAR_LANGUAGES.some((l) => l.code === value)
      ? findLanguage(value)
      : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SORTED_LANGUAGES;
    return SORTED_LANGUAGES.filter(
      (l) =>
        l.code.includes(q) ||
        l.en.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.bn.includes(query.trim()),
    );
  }, [query]);

  const select = (code: string) => {
    onChange(code);
    setExpanded(false);
    setQuery('');
  };

  return (
    <fieldset disabled={disabled} className="a2t-card p-4 sm:p-5 disabled:opacity-50">
      <legend className="sr-only">{t.language.label}</legend>

      <div className="mb-3 flex items-center gap-2">
        <SparkleIcon className="h-4 w-4 text-accent-400" />
        <h3 className="text-sm font-semibold text-slate-200">{t.language.label}</h3>
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="radiogroup"
        aria-label={t.language.label}
      >
        {quickPicks.map((option) => {
          const selected = value === option.code;
          return (
            <button
              key={option.code}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => select(option.code)}
              className={`rounded-xl border px-3 py-2.5 text-center transition-all ${
                selected
                  ? 'border-brand-400 bg-brand-500/15 shadow-sm shadow-brand-500/20'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <span
                className={`block truncate text-sm font-semibold ${
                  selected ? 'text-white' : 'text-slate-300'
                }`}
              >
                {option.primary}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                {option.secondary}
              </span>
            </button>
          );
        })}

        {selectedExtra && (
          <button
            type="button"
            role="radio"
            aria-checked
            onClick={() => select(selectedExtra.code)}
            className="rounded-xl border border-brand-400 bg-brand-500/15 px-3 py-2.5 text-center shadow-sm shadow-brand-500/20"
          >
            <span className="block truncate text-sm font-semibold text-white">
              {selectedExtra.native}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-slate-500">
              {locale === 'bn' ? selectedExtra.bn : selectedExtra.en}
            </span>
          </button>
        )}
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-brand-300 transition-colors hover:bg-white/5 hover:text-brand-200"
        >
          <span>{expanded ? t.language.label : t.language.more}</span>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/40 p-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.language.searchPlaceholder}
            aria-label={t.language.searchPlaceholder}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
          />

          <ul className="mt-2 max-h-56 space-y-0.5 overflow-y-auto pr-1" role="listbox">
            {filtered.map((language) => {
              const selected = value === language.code;
              return (
                <li key={language.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => select(language.code)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                      selected
                        ? 'bg-brand-500/20 text-white'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="truncate">
                      {language.native}
                      <span className="ml-2 text-[11px] text-slate-500">
                        {locale === 'bn' ? language.bn : language.en}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] uppercase text-slate-600">
                      {language.code}
                    </span>
                  </button>
                </li>
              );
            })}

            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-slate-500">{t.language.noMatch}</li>
            )}
          </ul>
        </div>
      )}

      <p className="mt-2.5 text-[11px] text-slate-500">
        {t.language.hint} ·{' '}
        {t.language.totalCount.replace('{count}', String(SORTED_LANGUAGES.length))}
      </p>
    </fieldset>
  );
}
