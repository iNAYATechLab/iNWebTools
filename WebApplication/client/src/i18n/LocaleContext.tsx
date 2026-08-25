import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { LOCALES, translations, type Locale, type Translation } from './translations';

const STORAGE_KEY = 'inwebtools.locale';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: Translation;
};

// eslint-disable-next-line react-refresh/only-export-components -- context object, not a component
export const LocaleContext = createContext<LocaleContextValue | null>(null);

function resolveInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'bn';

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (LOCALES as string[]).includes(stored)) return stored as Locale;

  // Fall back to the browser language, defaulting to Bengali.
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'bn';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale);

  // Keep <html lang> in sync so screen readers and CSS :lang() rules work.
  useEffect(() => {
    document.documentElement.lang = translations[locale].meta.htmlLang;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const toggleLocale = useCallback(
    () => setLocaleState((current) => (current === 'bn' ? 'en' : 'bn')),
    [],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, toggleLocale, t: translations[locale] }),
    [locale, setLocale, toggleLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
