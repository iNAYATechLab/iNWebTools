/**
 * Icons for the widget catalogue, keyed by the `icon` string a type declares.
 *
 * Inline SVG rather than an icon package: six glyphs do not justify a
 * dependency, and inline paths render in the sandboxed file preview where an
 * external sprite sheet would not load.
 */

const PATHS: Record<string, string> = {
  text: 'M3 4.75A.75.75 0 0 1 3.75 4h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 4.75Zm0 4A.75.75 0 0 1 3.75 8h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 8.75Zm0 4a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75Zm0 4a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Z',
  image:
    'M3 4.75C3 3.784 3.784 3 4.75 3h10.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 15.25 17H4.75A1.75 1.75 0 0 1 3 15.25V4.75Zm1.5 0v7.19l2.22-2.22a.75.75 0 0 1 1.06 0l2.97 2.97 1.72-1.72a.75.75 0 0 1 1.06 0l1.97 1.97V4.75a.25.25 0 0 0-.25-.25H4.75a.25.25 0 0 0-.25.25Zm8-.25a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  users:
    'M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 8a5.5 5.5 0 0 1 11 0 .75.75 0 0 1-.75.75h-9.5A.75.75 0 0 1 3 17Zm12.5-8.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm.5 1.5a4.5 4.5 0 0 1 3 4.25.75.75 0 0 1-.75.75h-2.06a6.97 6.97 0 0 0-1.44-4.6c.38-.26.8-.4 1.25-.4Z',
  history:
    'M10 3a7 7 0 1 0 6.36 4.09.75.75 0 1 0-1.37.61A5.5 5.5 0 1 1 10 4.5a.75.75 0 0 0 0-1.5Zm.75 3.5a.75.75 0 0 0-1.5 0V10c0 .28.16.54.4.67l2.5 1.34a.75.75 0 1 0 .7-1.32l-2.1-1.12V6.5Z',
  tools:
    'M13.5 3a3.5 3.5 0 0 0-3.28 4.74l-6.4 6.4a1.75 1.75 0 0 0 2.48 2.47l6.4-6.4A3.5 3.5 0 1 0 13.5 3Zm0 1.5a2 2 0 0 1 .7 3.87.75.75 0 0 0-.35 1.17l-.05.05-6.6 6.6a.25.25 0 0 1-.36-.36l6.6-6.6.05-.05a.75.75 0 0 0 1.17-.35A2 2 0 0 1 13.5 4.5Z',
  stats:
    'M4 16.25a.75.75 0 0 1-.75-.75V9.75a.75.75 0 0 1 1.5 0v5.75a.75.75 0 0 1-.75.75Zm4.5 0a.75.75 0 0 1-.75-.75V4.75a.75.75 0 0 1 1.5 0V15.5a.75.75 0 0 1-.75.75Zm4.5 0a.75.75 0 0 1-.75-.75V7.75a.75.75 0 0 1 1.5 0V15.5a.75.75 0 0 1-.75.75Zm4.5 0a.75.75 0 0 1-.75-.75v-3.75a.75.75 0 0 1 1.5 0V15.5a.75.75 0 0 1-.75.75Z',
};

/** Fallback: a generic block, so an unrecognised icon key still renders. */
const FALLBACK =
  'M4.75 3A1.75 1.75 0 0 0 3 4.75v10.5c0 .966.784 1.75 1.75 1.75h10.5A1.75 1.75 0 0 0 17 15.25V4.75A1.75 1.75 0 0 0 15.25 3H4.75Z';

export function WidgetIcon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d={PATHS[name] ?? FALLBACK} />
    </svg>
  );
}
