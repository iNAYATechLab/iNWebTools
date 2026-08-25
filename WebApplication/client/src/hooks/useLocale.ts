import { useContext } from 'react';

import { LocaleContext } from '../i18n/LocaleContext';

/** Access the active locale and its translation table. */
export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used inside <LocaleProvider>.');
  }
  return context;
}
