import { useState } from 'react';

import type { CharacterMood } from '../components/auth/AuthCharacter';

/**
 * Tracks what the guide character should be doing.
 *
 * Two layers: the focused field sets a transient mood, and a submit result can
 * latch one that outranks it — otherwise blurring the field on submit would
 * wipe the celebration before anyone saw it.
 */
export function useCharacterMood() {
  const [mood, setMood] = useState<CharacterMood>('idle');
  const [sticky, setSticky] = useState<CharacterMood | null>(null);

  return {
    mood: sticky ?? mood,
    /** Call on focus/blur of a field. */
    setFieldMood: (next: CharacterMood) => setMood(next),
    /** Latch a mood until cleared with null — used for submit results. */
    latch: (next: CharacterMood | null) => setSticky(next),
  };
}
