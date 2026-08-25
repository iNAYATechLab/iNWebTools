import { useState } from 'react';

import { useLayout } from '../hooks/useLayout';
import { useLocale } from '../hooks/useLocale';
import { PLATFORM_LABELS } from '../types/socialLabels';
import { SocialIcon } from './SocialIcons';

function linkProps(newTab: boolean) {
  return newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

/**
 * Newsletter capture.
 *
 * There is no subscriber backend yet, so this validates and acknowledges
 * locally rather than pretending to store an address. The toggle exists so the
 * form can be published the moment a provider is wired up.
 */
function NewsletterForm({
  heading,
  description,
  buttonLabel,
  placeholder,
}: {
  heading: string;
  description: string;
  buttonLabel: string;
  placeholder: string;
}) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  return (
    <div className="w-full max-w-sm">
      <h3 className="text-sm font-semibold text-slate-200">{heading}</h3>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}

      {done ? (
        <p className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Thanks — we&apos;ll be in touch at {email}.
        </p>
      ) : (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
          }}
        >
          <label htmlFor="newsletter-email" className="sr-only">
            {placeholder}
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-brand-400 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-400"
          >
            {buttonLabel}
          </button>
        </form>
      )}
    </div>
  );
}

export function Footer() {
  const { t } = useLocale();
  const { layout } = useLayout();
  const f = layout.footer;

  // `{year}` in the copyright is substituted here so the stored text does not
  // go stale on 1 January.
  const copyright = f.copyrightText.replace('{year}', String(new Date().getFullYear()));

  const hasColumns = f.columns.length > 0;
  const hasSocial = f.socialLinks.length > 0;
  const hasUpper = hasColumns || hasSocial || f.newsletter.enabled;

  return (
    <footer className="mt-auto border-t border-white/5 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {hasUpper && (
          <div className="mb-8 grid gap-8 border-b border-white/5 pb-8 md:grid-cols-2 lg:grid-cols-4">
            {hasColumns &&
              f.columns.map((column) => (
                <div key={column.title}>
                  {column.title && (
                    <h3 className="mb-3 text-sm font-semibold text-slate-200">{column.title}</h3>
                  )}
                  <ul className="space-y-2">
                    {column.items.map((item) => (
                      <li key={`${item.label}-${item.url}`}>
                        <a
                          href={item.url}
                          {...linkProps(item.newTab)}
                          className="text-xs text-slate-400 transition-colors hover:text-brand-300"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

            {f.newsletter.enabled && (
              <div className={hasColumns ? 'md:col-span-2 lg:col-span-1' : 'md:col-span-2'}>
                <NewsletterForm
                  heading={f.newsletter.heading}
                  description={f.newsletter.description}
                  buttonLabel={f.newsletter.buttonLabel}
                  placeholder={f.newsletter.placeholder}
                />
              </div>
            )}

            {hasSocial && !f.newsletter.enabled && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-200">Follow</h3>
                <div className="flex flex-wrap gap-2">
                  {f.socialLinks.map((social) => (
                    <a
                      key={`${social.platform}-${social.url}`}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label || PLATFORM_LABELS[social.platform]}
                      title={social.label || PLATFORM_LABELS[social.platform]}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-brand-400/40 hover:text-brand-300"
                    >
                      <SocialIcon platform={social.platform} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          {f.showPrivacyNote && (
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 text-emerald-400"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6l7-3Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              {t.footer.privacy}
            </p>
          )}

          {f.tagline && <p className="max-w-xl text-xs text-slate-500">{f.tagline}</p>}

          {/* When the newsletter takes the fourth column, social moves down here. */}
          {hasSocial && f.newsletter.enabled && (
            <div className="flex flex-wrap justify-center gap-2">
              {f.socialLinks.map((social) => (
                <a
                  key={`b-${social.platform}-${social.url}`}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label || PLATFORM_LABELS[social.platform]}
                  title={social.label || PLATFORM_LABELS[social.platform]}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-brand-400/40 hover:text-brand-300"
                >
                  <SocialIcon platform={social.platform} className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-600">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
