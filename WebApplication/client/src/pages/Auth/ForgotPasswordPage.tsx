import { useState, type FormEvent } from 'react';

import { AuthLink, AuthShell, Banner, Field, SubmitButton } from '../../components/auth/AuthShell';
import { useCharacterMood } from '../../hooks/useCharacterMood';
import { useLocale } from '../../hooks/useLocale';
import * as adminApi from '../../services/adminApi';

export function ForgotPasswordPage() {
  const { t } = useLocale();
  const { mood, setFieldMood, latch } = useCharacterMood();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const a = t.auth;

  const speech =
    mood === 'watching'
      ? a.speech.forgotEmail
      : mood === 'cheering'
        ? a.speech.sent
        : mood === 'sad'
          ? a.speech.tryAgain
          : a.speech.forgotGreeting;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    latch(null);

    try {
      const result = await adminApi.requestPasswordReset(email.trim());
      latch('cheering');
      setSent(result.message);
      // Development only: the server returns the link when no mail transport
      // is configured, so the flow is testable without an inbox.
      setDevLink(result.devLink ?? null);
    } catch (err) {
      latch('sad');
      setError(err instanceof adminApi.AdminApiError ? err.message : a.errors.network);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      // Thinking is the resting mood here — it suits the page.
      mood={mood === 'idle' ? 'thinking' : mood}
      speech={speech}
      title={a.forgot.title}
      subtitle={a.forgot.subtitle}
      footer={
        <p>
          {a.forgot.remembered} <AuthLink to="/login">{a.forgot.loginLink}</AuthLink>
        </p>
      }
    >
      {error && <Banner tone="error">{error}</Banner>}

      {sent ? (
        <div className="space-y-4">
          <Banner tone="success">{sent}</Banner>

          {devLink && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              <p className="font-semibold">{a.forgot.devNoticeTitle}</p>
              <p className="mt-1 text-amber-200/80">{a.forgot.devNoticeBody}</p>
              <a
                href={devLink}
                className="mt-2 inline-block break-all font-mono text-[11px] text-amber-100 underline underline-offset-2"
              >
                {devLink}
              </a>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            name="email"
            label={a.fields.email}
            type="email"
            hint={a.forgot.emailHint}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFieldMood('watching')}
            onBlur={() => setFieldMood('idle')}
            required
          />

          <SubmitButton busy={busy} onHoverMood={() => !busy && setFieldMood('cheering')}>
            {busy ? a.forgot.submitting : a.forgot.submit}
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
