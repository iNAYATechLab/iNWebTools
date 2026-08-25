/**
 * Shared chrome for the sign-in, register and forgot-password pages.
 *
 * Holds the character, the mood state and the field primitives so the three
 * pages only describe their own fields and submit logic.
 */

import type { InputHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { AuthCharacter, type CharacterMood } from './AuthCharacter';

/* ---------------- Field ---------------- */

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  /** Rendered after the input, inside the same row — used for the reveal toggle. */
  trailing?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function Field({ label, error, hint, trailing, id, ...input }: FieldProps) {
  const inputId = id ?? input.name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          {...input}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-xl border bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:ring-2 ${
            error
              ? 'border-rose-500/50 focus:border-rose-400 focus:ring-rose-500/20'
              : 'border-white/10 focus:border-brand-400 focus:ring-brand-500/20'
          } ${trailing ? 'pr-11' : ''}`}
        />
        {trailing && <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-rose-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Eye toggle for password fields. */
export function RevealToggle({
  shown,
  onToggle,
  label,
}: {
  shown: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={shown}
      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        {shown ? (
          <path
            d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7a11 11 0 01-2.3 3.4M6.2 6.6A11.6 11.6 0 003 12c0 2.5 4 7 9 7a9.6 9.6 0 003.6-.7"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        ) : (
          <>
            <path
              d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
          </>
        )}
      </svg>
    </button>
  );
}

/** Primary submit button with a spinner state. */
export function SubmitButton({
  busy,
  children,
  onHoverMood,
}: {
  busy: boolean;
  children: ReactNode;
  onHoverMood?: () => void;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      onMouseEnter={onHoverMood}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      )}
      {children}
    </button>
  );
}

/* ---------------- Shell ---------------- */

export function AuthShell({
  mood,
  title,
  subtitle,
  speech,
  children,
  footer,
}: {
  mood: CharacterMood;
  title: string;
  subtitle: string;
  /** What the character says — changes with the mood. */
  speech: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-900 px-4 py-10">
      {/* Decorative wash; never intercepts pointer events. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[120px]" />
        <div className="absolute -bottom-52 right-0 h-[420px] w-[620px] rounded-full bg-accent-500/10 blur-[120px]" />
      </div>

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/40 backdrop-blur-xl md:grid-cols-[1fr_1.1fr]">
        {/* Character panel — hidden on small screens, where the form matters more. */}
        <div className="hidden flex-col items-center justify-center gap-4 border-r border-white/5 bg-gradient-to-b from-brand-500/10 to-transparent p-8 md:flex">
          <AuthCharacter mood={mood} className="h-52 w-52" />
          <p
            aria-live="polite"
            className="min-h-[3rem] max-w-[15rem] rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm text-slate-300"
          >
            {speech}
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {/* Small screens still get the character, just smaller and inline. */}
          <div className="mb-4 flex items-center gap-3 md:hidden">
            <AuthCharacter mood={mood} className="h-16 w-16 shrink-0" />
            <p aria-live="polite" className="text-xs text-slate-400">
              {speech}
            </p>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>

          <div className="mt-6">{children}</div>

          <div className="mt-6 border-t border-white/5 pt-4 text-center text-sm text-slate-400">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Consistent inline link styling inside the auth footers. */
export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-brand-300 transition-colors hover:text-brand-200">
      {children}
    </Link>
  );
}

/** Error / success / informational banner. */
export function Banner({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const styles =
    tone === 'error'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
      : tone === 'info'
        ? 'border-brand-400/30 bg-brand-500/10 text-brand-200'
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';

  return (
    <div
      // `alert` interrupts a screen reader; an informational notice is not
      // urgent enough to deserve that.
      role={tone === 'info' ? 'status' : 'alert'}
      className={`mb-4 rounded-xl border px-3.5 py-2.5 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}
