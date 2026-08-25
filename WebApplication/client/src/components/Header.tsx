import { useEffect, useState } from 'react';

import { AccountMenu } from './AccountMenu';
import { useLayout } from '../hooks/useLayout';
import { useLocale } from '../hooks/useLocale';
import { getHealth } from '../services/api';
import { LOCALES, translations } from '../i18n/translations';
import type { HealthStatus } from '../types';
import type { LayoutActionButton, LayoutLink } from '../types/layout';
import { GlobeIcon, WaveIcon } from './icons';

/** Small coloured pill reflecting backend availability. */
function StatusPill({ health, loading }: { health: HealthStatus | null; loading: boolean }) {
  const { t } = useLocale();

  const { label, dot, ring } = loading
    ? { label: t.status.checking, dot: 'bg-slate-400', ring: 'bg-slate-400/60' }
    : !health
      ? { label: t.status.offline, dot: 'bg-rose-400', ring: 'bg-rose-400/60' }
      : health.transcriptionReady
        ? { label: t.status.online, dot: 'bg-emerald-400', ring: 'bg-emerald-400/60' }
        : { label: t.status.notConfigured, dot: 'bg-amber-400', ring: 'bg-amber-400/60' };

  return (
    <span
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300"
      role="status"
    >
      <span className="relative flex h-2 w-2">
        {!loading && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${ring}`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      {label}
    </span>
  );
}

/**
 * `target="_blank"` without `rel="noopener"` lets the opened page reach back
 * through `window.opener`. Centralised here so no call site can forget it.
 */
function linkProps(newTab: boolean) {
  return newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

function ActionButton({ button }: { button: LayoutActionButton }) {
  const styles =
    button.variant === 'primary'
      ? 'bg-brand-500 text-white hover:bg-brand-400 shadow-sm shadow-brand-500/25'
      : 'border border-white/15 text-slate-200 hover:bg-white/5';

  return (
    <a
      href={button.url}
      {...linkProps(button.newTab)}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${styles}`}
    >
      {button.label}
    </a>
  );
}

/** Dismissible announcement bar above the header. */
function NoticeBar({
  text,
  linkLabel,
  linkUrl,
}: {
  text: string;
  linkLabel: string;
  linkUrl: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-brand-600/90 to-accent-600/90 px-4 py-2 text-center text-xs font-medium text-white sm:px-6">
      <span>{text}</span>
      {linkUrl && linkLabel && (
        <a href={linkUrl} className="ml-2 underline underline-offset-2 hover:no-underline">
          {linkLabel}
        </a>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function Header() {
  const { locale, setLocale, t } = useLocale();
  const { layout } = useLayout();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const h = layout.header;
  const hasNav = h.navLinks.length > 0;
  const hasActions = h.actionButtons.length > 0;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    // `.finally()` still runs after an abort, so guard every state write —
    // otherwise StrictMode's double-mount updates an unmounted component.
    getHealth(controller.signal)
      .then((value) => {
        if (active) setHealth(value);
      })
      .catch(() => {
        if (active) setHealth(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-900/80 backdrop-blur-xl">
      {h.notice.isVisible && h.notice.text && (
        <NoticeBar text={h.notice.text} linkLabel={h.notice.linkLabel} linkUrl={h.notice.linkUrl} />
      )}

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        {/* Logo + title */}
        <a href="/" className="group flex min-w-0 items-center gap-3" aria-label={h.siteTitle}>
          <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/25 transition-transform group-hover:scale-105">
            {h.logoUrl ? (
              <img src={h.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <WaveIcon className="h-5 w-5" />
            )}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-lg font-bold tracking-tight text-white">
              {h.siteTitle}
            </span>
            <span className="block truncate text-[11px] font-medium text-slate-400">
              {h.tagline || t.header.tagline}
            </span>
          </span>
        </a>

        {/* Desktop navigation */}
        {hasNav && (
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {h.navLinks.map((link: LayoutLink) => (
              <a
                key={`${link.label}-${link.url}`}
                href={link.url}
                {...linkProps(link.newTab)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {h.showStatusPill && (
            <span className="hidden sm:block">
              <StatusPill health={health} loading={loading} />
            </span>
          )}

          {hasActions && (
            <span className="hidden items-center gap-2 md:flex">
              {h.actionButtons.map((button) => (
                <ActionButton key={`${button.label}-${button.url}`} button={button} />
              ))}
            </span>
          )}

          {h.showLocaleToggle && (
            <div
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1"
              role="group"
              aria-label="Language / ভাষা"
            >
              <GlobeIcon className="ml-1.5 h-3.5 w-3.5 text-slate-400" />
              {LOCALES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLocale(code)}
                  aria-pressed={locale === code}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                    locale === code
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {translations[code].meta.label}
                </button>
              ))}
            </div>
          )}

          <AccountMenu />

          {/* Mobile menu toggle — only when there is something to reveal. */}
          {(hasNav || hasActions) && (
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:bg-white/5 lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                <path
                  d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (hasNav || hasActions) && (
        <div className="border-t border-white/5 bg-ink-900/95 px-4 py-3 lg:hidden">
          {hasNav && (
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {h.navLinks.map((link) => (
                <a
                  key={`m-${link.label}-${link.url}`}
                  href={link.url}
                  {...linkProps(link.newTab)}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}
          {hasActions && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3 md:hidden">
              {h.actionButtons.map((button) => (
                <ActionButton key={`m-${button.label}-${button.url}`} button={button} />
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
