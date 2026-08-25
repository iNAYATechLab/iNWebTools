/**
 * Header & Footer CMS.
 *
 * Edits the single layout document that drives the public site's header and
 * footer. State is held as one `LayoutConfig` object and saved atomically, so
 * the two halves can never be persisted out of step.
 *
 * The server sanitises everything again on receipt — this page's validation is
 * there to give fast feedback, not to be the security boundary.
 */

import { useEffect, useRef, useState } from 'react';

import { saveLayout } from '../../../services/adminApi';
import { getLayout } from '../../../services/api';
import {
  DEFAULT_LAYOUT,
  SOCIAL_PLATFORMS,
  type LayoutColumn,
  type LayoutConfig,
  type LayoutLink,
  type SocialPlatform,
} from '../../../types/layout';
import { formatDateTime } from '../components/format';
import {
  AddButton,
  Field,
  RowCard,
  RowHeader,
  TextArea,
  TextInput,
  Toggle,
} from '../components/form';
import { Badge, Button, Card, ErrorState, LoadingBlock, PageHeader } from '../components/ui';

/* Mirrors the server's LIMITS so the UI disables "Add" at the same point. */
const LIMITS = {
  navLinks: 12,
  actionButtons: 4,
  footerColumns: 5,
  footerItems: 10,
  socialLinks: 10,
};

const emptyLink = (): LayoutLink => ({ label: '', url: '', newTab: false });

/** Move an item within an array, returning a new array. */
function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  // splice always yields one element for a valid `from`, but the compiler
  // cannot know that under noUncheckedIndexedAccess.
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}

export function HeaderFooterManager() {
  const [form, setForm] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [meta, setMeta] = useState<{ updatedAt: string | null; updatedBy: string | null }>({
    updatedAt: null,
    updatedBy: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'header' | 'footer'>('header');

  const savedTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();

    getLayout(controller.signal)
      .then((res) => {
        setForm(res.value);
        setMeta({ updatedAt: res.updatedAt, updatedBy: res.updatedBy });
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => {
      controller.abort();
      window.clearTimeout(savedTimer.current);
    };
  }, []);

  /* ---------------- Section updaters ---------------- */

  const setHeader = (patch: Partial<LayoutConfig['header']>) =>
    setForm((prev) => ({ ...prev, header: { ...prev.header, ...patch } }));

  const setFooter = (patch: Partial<LayoutConfig['footer']>) =>
    setForm((prev) => ({ ...prev, footer: { ...prev.footer, ...patch } }));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await saveLayout(form);
      // Render what the server actually stored, not what we sent: invalid
      // links are stripped server-side and the admin should see that happen.
      setForm(res.value);
      setMeta({ updatedAt: new Date().toISOString(), updatedBy: res.updatedBy });
      setError(null);
      setSaved(true);
      savedTimer.current = window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock />;

  const h = form.header;
  const f = form.footer;

  return (
    <div>
      <PageHeader
        title="Header & Footer CMS"
        subtitle="Edit the site-wide header and footer. Changes go live on the next page load."
      />

      {error && <ErrorState message={error} />}

      {/* Sticky action bar so Save is reachable from anywhere in a long form. */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-ink-900/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {(['header', 'footer'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                tab === key ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-emerald-400">Saved</span>}
          <span className="hidden text-[11px] text-slate-600 sm:inline">
            Updated {formatDateTime(meta.updatedAt)}
            {meta.updatedBy ? ` by ${meta.updatedBy}` : ''}
          </span>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      {/* ---------------- HEADER ---------------- */}
      {tab === 'header' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Card title="Branding">
              <Field label="Site title" htmlFor="hf-title">
                <TextInput
                  id="hf-title"
                  value={h.siteTitle}
                  onChange={(v) => setHeader({ siteTitle: v })}
                  placeholder="iNWebTools"
                />
              </Field>
              <Field
                label="Tagline"
                htmlFor="hf-tagline"
                hint="Shown under the title. Leave blank to use the translated default."
              >
                <TextInput
                  id="hf-tagline"
                  value={h.tagline}
                  onChange={(v) => setHeader({ tagline: v })}
                  placeholder="Speech to text, in seconds"
                />
              </Field>
              <Field
                label="Logo URL"
                htmlFor="hf-logo"
                hint="https:// or a site-relative path. Blank shows the built-in wave mark."
              >
                <TextInput
                  id="hf-logo"
                  type="url"
                  value={h.logoUrl}
                  onChange={(v) => setHeader({ logoUrl: v })}
                  placeholder="https://example.com/logo.png"
                />
              </Field>
            </Card>

            <Card title="Top notice banner">
              <Toggle
                checked={h.notice.isVisible}
                onChange={(v) => setHeader({ notice: { ...h.notice, isVisible: v } })}
                label="Show the banner"
                hint="Appears above the header. Visitors can dismiss it."
              />
              <Field label="Text" htmlFor="hf-notice-text">
                <TextArea
                  id="hf-notice-text"
                  value={h.notice.text}
                  onChange={(v) => setHeader({ notice: { ...h.notice, text: v } })}
                  placeholder="We now support 99 languages."
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Link label" htmlFor="hf-notice-label">
                  <TextInput
                    id="hf-notice-label"
                    value={h.notice.linkLabel}
                    onChange={(v) => setHeader({ notice: { ...h.notice, linkLabel: v } })}
                    placeholder="Learn more"
                  />
                </Field>
                <Field label="Link URL" htmlFor="hf-notice-url">
                  <TextInput
                    id="hf-notice-url"
                    type="url"
                    value={h.notice.linkUrl}
                    onChange={(v) => setHeader({ notice: { ...h.notice, linkUrl: v } })}
                    placeholder="/changelog"
                  />
                </Field>
              </div>
            </Card>

            <Card title="Visibility">
              <Toggle
                checked={h.showStatusPill}
                onChange={(v) => setHeader({ showStatusPill: v })}
                label="Backend status pill"
                hint="The green/amber dot showing API availability."
              />
              <Toggle
                checked={h.showLocaleToggle}
                onChange={(v) => setHeader({ showLocaleToggle: v })}
                label="Language switcher"
                hint="Turning this off locks visitors to the default language."
              />
            </Card>
          </div>

          <div className="space-y-4">
            <Card
              title="Navigation links"
              description={`${h.navLinks.length} of ${LIMITS.navLinks}`}
            >
              {h.navLinks.map((link, i) => (
                <RowCard key={`nav-${i}`}>
                  <RowHeader
                    title={`Link ${i + 1}`}
                    onRemove={() =>
                      setHeader({ navLinks: h.navLinks.filter((_, idx) => idx !== i) })
                    }
                    onMoveUp={
                      i > 0 ? () => setHeader({ navLinks: move(h.navLinks, i, i - 1) }) : undefined
                    }
                    onMoveDown={
                      i < h.navLinks.length - 1
                        ? () => setHeader({ navLinks: move(h.navLinks, i, i + 1) })
                        : undefined
                    }
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <TextInput
                      value={link.label}
                      onChange={(v) =>
                        setHeader({
                          navLinks: h.navLinks.map((l, idx) =>
                            idx === i ? { ...l, label: v } : l,
                          ),
                        })
                      }
                      placeholder="Label"
                    />
                    <TextInput
                      type="url"
                      value={link.url}
                      onChange={(v) =>
                        setHeader({
                          navLinks: h.navLinks.map((l, idx) => (idx === i ? { ...l, url: v } : l)),
                        })
                      }
                      placeholder="/pricing"
                    />
                  </div>
                  <Toggle
                    checked={link.newTab}
                    onChange={(v) =>
                      setHeader({
                        navLinks: h.navLinks.map((l, idx) => (idx === i ? { ...l, newTab: v } : l)),
                      })
                    }
                    label="Open in a new tab"
                  />
                </RowCard>
              ))}
              <AddButton
                label="Add link"
                disabled={h.navLinks.length >= LIMITS.navLinks}
                onClick={() => setHeader({ navLinks: [...h.navLinks, emptyLink()] })}
              />
            </Card>

            <Card
              title="Action buttons"
              description={`${h.actionButtons.length} of ${LIMITS.actionButtons}`}
            >
              {h.actionButtons.map((button, i) => (
                <RowCard key={`btn-${i}`}>
                  <RowHeader
                    title={`Button ${i + 1}`}
                    onRemove={() =>
                      setHeader({ actionButtons: h.actionButtons.filter((_, idx) => idx !== i) })
                    }
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <TextInput
                      value={button.label}
                      onChange={(v) =>
                        setHeader({
                          actionButtons: h.actionButtons.map((b, idx) =>
                            idx === i ? { ...b, label: v } : b,
                          ),
                        })
                      }
                      placeholder="Sign up"
                    />
                    <TextInput
                      type="url"
                      value={button.url}
                      onChange={(v) =>
                        setHeader({
                          actionButtons: h.actionButtons.map((b, idx) =>
                            idx === i ? { ...b, url: v } : b,
                          ),
                        })
                      }
                      placeholder="/signup"
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    {(['primary', 'ghost'] as const).map((variant) => (
                      <button
                        key={variant}
                        type="button"
                        aria-pressed={button.variant === variant}
                        onClick={() =>
                          setHeader({
                            actionButtons: h.actionButtons.map((b, idx) =>
                              idx === i ? { ...b, variant } : b,
                            ),
                          })
                        }
                        className={`rounded-lg border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                          button.variant === variant
                            ? 'border-brand-400/40 bg-brand-500/15 text-brand-200'
                            : 'border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        {variant}
                      </button>
                    ))}
                  </div>
                </RowCard>
              ))}
              <AddButton
                label="Add button"
                disabled={h.actionButtons.length >= LIMITS.actionButtons}
                onClick={() =>
                  setHeader({
                    actionButtons: [...h.actionButtons, { ...emptyLink(), variant: 'primary' }],
                  })
                }
              />
            </Card>
          </div>
        </div>
      )}

      {/* ---------------- FOOTER ---------------- */}
      {tab === 'footer' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Card title="Copyright & tagline">
              <Field
                label="Copyright text"
                htmlFor="hf-copyright"
                hint="Use {year} and it is replaced with the current year automatically."
              >
                <TextInput
                  id="hf-copyright"
                  value={f.copyrightText}
                  onChange={(v) => setFooter({ copyrightText: v })}
                  maxLength={500}
                  placeholder="© {year} iNWebTools"
                />
              </Field>
              <Field label="Tagline" htmlFor="hf-ftagline">
                <TextArea
                  id="hf-ftagline"
                  value={f.tagline}
                  onChange={(v) => setFooter({ tagline: v })}
                  placeholder="Built for accurate, private transcription."
                />
              </Field>
              <Toggle
                checked={f.showPrivacyNote}
                onChange={(v) => setFooter({ showPrivacyNote: v })}
                label="Privacy note"
                hint="The shield line confirming audio is not stored."
              />
            </Card>

            <Card title="Newsletter">
              <Toggle
                checked={f.newsletter.enabled}
                onChange={(v) => setFooter({ newsletter: { ...f.newsletter, enabled: v } })}
                label="Show the signup form"
                hint="No subscriber backend is connected yet — submissions are acknowledged in the browser only."
              />
              <Field label="Heading" htmlFor="hf-nl-heading">
                <TextInput
                  id="hf-nl-heading"
                  value={f.newsletter.heading}
                  onChange={(v) => setFooter({ newsletter: { ...f.newsletter, heading: v } })}
                  placeholder="Stay in the loop"
                />
              </Field>
              <Field label="Description" htmlFor="hf-nl-desc">
                <TextArea
                  id="hf-nl-desc"
                  value={f.newsletter.description}
                  onChange={(v) => setFooter({ newsletter: { ...f.newsletter, description: v } })}
                  placeholder="Product updates, roughly once a month."
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Button label" htmlFor="hf-nl-btn">
                  <TextInput
                    id="hf-nl-btn"
                    value={f.newsletter.buttonLabel}
                    onChange={(v) => setFooter({ newsletter: { ...f.newsletter, buttonLabel: v } })}
                    placeholder="Subscribe"
                  />
                </Field>
                <Field label="Input placeholder" htmlFor="hf-nl-ph">
                  <TextInput
                    id="hf-nl-ph"
                    value={f.newsletter.placeholder}
                    onChange={(v) => setFooter({ newsletter: { ...f.newsletter, placeholder: v } })}
                    placeholder="you@example.com"
                  />
                </Field>
              </div>
            </Card>

            <Card
              title="Social links"
              description={`${f.socialLinks.length} of ${LIMITS.socialLinks}`}
            >
              {f.socialLinks.map((social, i) => (
                <RowCard key={`soc-${i}`}>
                  <RowHeader
                    title={`Link ${i + 1}`}
                    onRemove={() =>
                      setFooter({ socialLinks: f.socialLinks.filter((_, idx) => idx !== i) })
                    }
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={social.platform}
                      aria-label="Platform"
                      onChange={(e) =>
                        setFooter({
                          socialLinks: f.socialLinks.map((s, idx) =>
                            idx === i ? { ...s, platform: e.target.value as SocialPlatform } : s,
                          ),
                        })
                      }
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm capitalize text-slate-200 focus:border-brand-400 focus:outline-none"
                    >
                      {SOCIAL_PLATFORMS.map((platform) => (
                        <option key={platform} value={platform} className="bg-ink-900">
                          {platform}
                        </option>
                      ))}
                    </select>
                    <TextInput
                      type="url"
                      value={social.url}
                      onChange={(v) =>
                        setFooter({
                          socialLinks: f.socialLinks.map((s, idx) =>
                            idx === i ? { ...s, url: v } : s,
                          ),
                        })
                      }
                      placeholder="https://github.com/iNAYATechLab"
                    />
                  </div>
                </RowCard>
              ))}
              <AddButton
                label="Add social link"
                disabled={f.socialLinks.length >= LIMITS.socialLinks}
                onClick={() =>
                  setFooter({
                    socialLinks: [...f.socialLinks, { platform: 'website', url: '', label: '' }],
                  })
                }
              />
            </Card>
          </div>

          <Card title="Link columns" description={`${f.columns.length} of ${LIMITS.footerColumns}`}>
            {f.columns.map((column, ci) => (
              <div
                key={`col-${ci}`}
                className="mb-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
              >
                <RowHeader
                  title={`Column ${ci + 1}`}
                  onRemove={() => setFooter({ columns: f.columns.filter((_, idx) => idx !== ci) })}
                  onMoveUp={
                    ci > 0 ? () => setFooter({ columns: move(f.columns, ci, ci - 1) }) : undefined
                  }
                  onMoveDown={
                    ci < f.columns.length - 1
                      ? () => setFooter({ columns: move(f.columns, ci, ci + 1) })
                      : undefined
                  }
                />
                <TextInput
                  value={column.title}
                  onChange={(v) =>
                    setFooter({
                      columns: f.columns.map((c, idx) =>
                        idx === ci ? { ...c, title: v } : c,
                      ) as LayoutColumn[],
                    })
                  }
                  placeholder="Column title — e.g. Product"
                />

                <div className="mt-2 space-y-2 border-l border-white/5 pl-3">
                  {column.items.map((item, ii) => (
                    <div
                      key={`col-${ci}-item-${ii}`}
                      className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <TextInput
                        value={item.label}
                        onChange={(v) =>
                          setFooter({
                            columns: f.columns.map((c, idx) =>
                              idx === ci
                                ? {
                                    ...c,
                                    items: c.items.map((it, j) =>
                                      j === ii ? { ...it, label: v } : it,
                                    ),
                                  }
                                : c,
                            ),
                          })
                        }
                        placeholder="Label"
                      />
                      <TextInput
                        type="url"
                        value={item.url}
                        onChange={(v) =>
                          setFooter({
                            columns: f.columns.map((c, idx) =>
                              idx === ci
                                ? {
                                    ...c,
                                    items: c.items.map((it, j) =>
                                      j === ii ? { ...it, url: v } : it,
                                    ),
                                  }
                                : c,
                            ),
                          })
                        }
                        placeholder="/docs"
                      />
                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={() =>
                          setFooter({
                            columns: f.columns.map((c, idx) =>
                              idx === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : c,
                            ),
                          })
                        }
                        className="grid h-9 w-9 place-items-center rounded-lg text-rose-400/70 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M6 6l12 12M18 6L6 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <AddButton
                    label="Add item"
                    disabled={column.items.length >= LIMITS.footerItems}
                    onClick={() =>
                      setFooter({
                        columns: f.columns.map((c, idx) =>
                          idx === ci ? { ...c, items: [...c.items, emptyLink()] } : c,
                        ),
                      })
                    }
                  />
                </div>
              </div>
            ))}
            <AddButton
              label="Add column"
              disabled={f.columns.length >= LIMITS.footerColumns}
              onClick={() => setFooter({ columns: [...f.columns, { title: '', items: [] }] })}
            />

            <p className="mt-4 flex items-center gap-2 text-[11px] text-slate-600">
              <Badge tone="info">Note</Badge>
              Links with an empty label or an unsafe URL are dropped when saved.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
