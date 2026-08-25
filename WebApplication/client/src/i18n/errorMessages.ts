import type { Translation } from './translations';

/**
 * Maps a server/client error code to a localised message.
 *
 * Codes without dedicated copy (e.g. INTERNAL_ERROR, CORS_FORBIDDEN) fall back
 * to the generic UNKNOWN string rather than leaking an untranslated message.
 */
export function messageForCode(t: Translation, code: string): string {
  const table = t.errors as Record<string, string | undefined>;
  return table[code] ?? t.errors.UNKNOWN;
}
