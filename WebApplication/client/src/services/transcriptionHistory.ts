/**
 * Per-visitor transcription history, stored in the browser.
 *
 * Deliberately localStorage rather than the server. The Recent Transcriptions
 * widget shows what *this person* converted, and the site does not require an
 * account to transcribe — so there is no user to key server-side rows against
 * for an anonymous visitor. Keeping it client-side also means transcript text
 * never persists anywhere it was not already going, which matches the privacy
 * posture of the upload path (the audio file is deleted immediately).
 *
 * A change here is broadcast on a custom event as well as the native `storage`
 * event, because `storage` only fires in *other* tabs — the widget in the same
 * tab that just added an entry would never hear about it.
 */

const STORAGE_KEY = 'inwebtools.history';
const CHANGE_EVENT = 'inwebtools:history-changed';

/** Hard cap: this is a sidebar widget, not an archive. */
const MAX_ENTRIES = 20;

/** Enough text to recognise the file, not enough to bloat localStorage. */
const PREVIEW_CHARS = 160;

export type HistoryEntry = {
  id: string;
  fileName: string;
  characters: number;
  words: number;
  language: string;
  preview: string;
  createdAt: string;
};

function safeParse(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate shape: a hand-edited or half-written value must not crash the
    // widget that renders it.
    return parsed.filter(
      (e): e is HistoryEntry =>
        !!e &&
        typeof e === 'object' &&
        typeof (e as HistoryEntry).id === 'string' &&
        typeof (e as HistoryEntry).fileName === 'string',
    );
  } catch {
    return [];
  }
}

export function readHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

function write(entries: HistoryEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded or storage disabled (private mode, hardened settings).
    // History is a convenience; losing it must never break transcription.
    return;
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/** Record a completed transcription. Newest first. */
export function addHistoryEntry(input: {
  fileName: string;
  characters: number;
  words: number;
  language: string;
  text: string;
}) {
  if (typeof window === 'undefined') return;

  const entry: HistoryEntry = {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    fileName: input.fileName.slice(0, 120),
    characters: input.characters,
    words: input.words,
    language: input.language,
    preview: input.text.slice(0, PREVIEW_CHARS),
    createdAt: new Date().toISOString(),
  };

  write([entry, ...readHistory()].slice(0, MAX_ENTRIES));
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/**
 * Subscribe to history changes.
 * Listens to both the same-tab custom event and cross-tab `storage`.
 */
export function subscribeToHistory(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) listener();
  };

  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}
