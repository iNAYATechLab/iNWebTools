/**
 * Form primitives for the admin CMS pages.
 *
 * Separate from `ui.tsx` to keep that file focused on read-only display
 * components, and because these all own an input's label/id wiring.
 */

import type { ReactNode } from 'react';

const INPUT_CLASS =
  'w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-brand-400 focus:outline-none';

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  maxLength = 200,
  type = 'text',
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: 'text' | 'url' | 'email';
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={INPUT_CLASS}
    />
  );
}

export function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 2,
  maxLength = 500,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${INPUT_CLASS} resize-y`}
    />
  );
}

/**
 * Toggle switch.
 *
 * A real checkbox is kept in the DOM (visually hidden) rather than faking one
 * with a div: that preserves keyboard focus, space-to-toggle and screen-reader
 * semantics for free.
 */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block text-sm text-slate-200">{label}</span>
        {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`block h-6 w-11 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ink-900 ${
            checked ? 'bg-brand-500' : 'bg-white/10'
          }`}
        />
        <span
          aria-hidden="true"
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </label>
  );
}

/**
 * Dropdown for a fixed set of choices.
 *
 * A native <select> rather than a custom listbox: it gets keyboard support,
 * mobile's native picker and screen-reader semantics for free, and none of
 * the options here need rich formatting. `appearance-none` plus the inline
 * chevron is only to match the dark theme.
 */
export function Select({
  id,
  value,
  onChange,
  options,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_CLASS} appearance-none pr-9`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-slate-900">
            {option.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
      >
        <path
          fillRule="evenodd"
          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

/** Header for one entry in a repeatable list, with a remove control. */
export function RowHeader({
  title,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  title: string;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </span>
      <span className="flex items-center gap-1">
        {onMoveUp && (
          <button
            type="button"
            onClick={onMoveUp}
            aria-label="Move up"
            className="grid h-6 w-6 place-items-center rounded text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
              <path d="m6 14 6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {onMoveDown && (
          <button
            type="button"
            onClick={onMoveDown}
            aria-label="Move down"
            className="grid h-6 w-6 place-items-center rounded text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
              <path d="m6 10 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
          className="grid h-6 w-6 place-items-center rounded text-rose-400/70 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
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
      </span>
    </div>
  );
}

/** Dashed "+ Add" button closing a repeatable list. */
export function AddButton({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-lg border border-dashed border-white/15 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-brand-400/40 hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {disabled ? `${label} — limit reached` : `+ ${label}`}
    </button>
  );
}

/** Container for one repeatable entry. */
export function RowCard({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">{children}</div>
  );
}
