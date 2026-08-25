/**
 * Common chrome for every sidebar widget: card, optional title, body slot.
 *
 * Centralised so widgets stay focused on their content and every one of them
 * gets identical spacing, borders and heading treatment. A widget with an
 * empty title renders no heading at all rather than an empty element, which
 * is what makes a bare Custom HTML block look deliberate.
 */

import type { ReactNode } from 'react';

export function WidgetShell({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm ${className}`}
    >
      {title ? (
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

/** A label/value row, the shape most of the data widgets repeat. */
export function WidgetRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'good' | 'muted';
}) {
  const tones = {
    default: 'text-slate-200',
    good: 'text-emerald-300',
    muted: 'text-slate-400',
  };
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-medium tabular-nums ${tones[tone]}`}>{value}</span>
    </div>
  );
}

/** Placeholder for a stored widget whose type this build does not know. */
export function UnknownWidget({ type }: { type: string }) {
  return (
    <WidgetShell title="Unavailable widget">
      <p className="text-xs leading-relaxed text-slate-500">
        This layout references a widget type (<code className="text-slate-400">{type}</code>) that
        this version of the site cannot render. It has been skipped.
      </p>
    </WidgetShell>
  );
}
