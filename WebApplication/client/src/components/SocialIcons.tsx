/**
 * Inline SVG icons for footer social links.
 *
 * Inline rather than an icon font or remote sprite: the preview sandbox blocks
 * external requests, and a footer icon must never depend on a third party.
 */

import type { SocialPlatform } from '../types/layout';

const PATHS: Record<SocialPlatform, string> = {
  facebook: 'M14 9h3V6h-3a4 4 0 0 0-4 4v2H8v3h2v7h3v-7h2.5l.5-3h-3v-2a1 1 0 0 1 1-1Z',
  x: 'M4 4l7.5 9.5L4.5 20h2l5.8-6 4.7 6H21l-7.8-9.9L20 4h-2l-5.3 5.6L8.3 4H4Z',
  linkedin: 'M6.5 8.5v10M6.5 5.5v.01M11 18.5v-6a2.5 2.5 0 0 1 5 0v6M11 12.5v6',
  github:
    'M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.7c-2.6.6-3.2-1.2-3.2-1.2-.4-1.1-1-1.4-1-1.4-.9-.6 0-.6 0-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.1-.2-4.3-1-4.3-4.6 0-1 .4-1.9 1-2.5-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.3.2 2.3.1 2.6.6.6 1 1.5 1 2.5 0 3.6-2.2 4.4-4.3 4.6.3.3.6.9.6 1.8v2.7c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5Z',
  youtube:
    'M21 8.5s-.2-1.4-.8-2c-.7-.8-1.5-.8-1.9-.8C15.7 5.5 12 5.5 12 5.5s-3.7 0-6.3.2c-.4 0-1.2 0-1.9.8-.6.6-.8 2-.8 2S3 10.1 3 11.7v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.7.8 1.7.8 2.1.9 1.5.1 6.4.2 6.4.2s3.7 0 6.3-.2c.4 0 1.2 0 1.9-.8.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5c0-1.6-.2-3.3-.2-3.3ZM10.3 14.7V9.9l4.7 2.4-4.7 2.4Z',
  instagram:
    'M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4ZM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM17 6.5v.01',
  email: 'M3.5 6.5h17v11h-17v-11Zm0 .5 8.5 6 8.5-6',
  website:
    'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM3.5 12h17M12 3.5c2.5 2.7 2.5 14.3 0 17M12 3.5c-2.5 2.7-2.5 14.3 0 17',
};

/** Platforms drawn with a filled path rather than a stroke. */
const FILLED: SocialPlatform[] = ['facebook', 'x', 'youtube', 'github'];

export function SocialIcon({
  platform,
  className = 'h-4 w-4',
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  const filled = FILLED.includes(platform);

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? undefined : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[platform] ?? PATHS.website} />
    </svg>
  );
}
