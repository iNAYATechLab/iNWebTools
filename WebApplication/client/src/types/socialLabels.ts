/**
 * Human-readable platform names.
 *
 * Kept out of SocialIcons.tsx because that file must export only components
 * for React Fast Refresh to work (react-refresh/only-export-components).
 */

import type { SocialPlatform } from './layout';

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: 'Facebook',
  x: 'X',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  youtube: 'YouTube',
  instagram: 'Instagram',
  email: 'Email',
  website: 'Website',
};
