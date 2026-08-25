import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  AuthLink,
  AuthShell,
  Banner,
  Field,
  RevealToggle,
  SubmitButton,
} from '../../components/auth/AuthShell';
import { useCharacterMood } from '../../hooks/useCharacterMood';
import { useLocale } from '../../hooks/useLocale';
import * as adminApi from '../../services/adminApi';

/** Where the reset link lands: ?token=… sets the new password. */
export function ResetPasswordPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { mood, setFieldMood, latch } = useCharacterMood();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const a = t.auth;

  const speech =
    mood === 'hiding'
      ? a.speech.password
      : mood === 'peeking'
        ? a.speech.peeking
        : mood === 'cheering'
          ? a.speech.passwordChanged
          : mood === 'sad'
            ? a.speech.tryAgain
            : a.speech.resetGreeting;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    latch(null);

    try {
      await adminApi.resetPassword(token, password);
      latch('cheering');
      setDone(true);
      // A moment to read the confirmation before the redirect.
      setTimeout(() => navigate('/login', { replace: true }), 2200);
    } catch (err) {
      latch('sad');
      setError(err instanceof adminApi.AdminApiError ? err.message : a.errors.network);
      setBusy(false);
    }
  }

  // A link without a token cannot work; say so rather than showing a form
  // that is guaranteed to fail on submit.
  if (!token) {
    return (
      <AuthShell
        mood="sad"
        speech={a.speech.badLink}
        title={a.reset.invalidTitle}
        subtitle={a.reset.invalidSubtitle}
        footer={
          <p>
            <AuthLink to="/forgot-password">{a.reset.requestNew}</AuthLink>
          </p>
        }
      >
        <Banner tone="error">{a.reset.invalidBody}</Banner>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      mood={mood}
      speech={speech}
      title={a.reset.title}
      subtitle={a.reset.subtitle}
      footer={
        <p>
          <AuthLink to="/login">{a.reset.backToLogin}</AuthLink>
        </p>
      }
    >
      {error && <Banner tone="error">{error}</Banner>}

      {done ? (
        <Banner tone="success">{a.reset.success}</Banner>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            name="password"
            label={a.reset.newPassword}
            type={showPassword ? 'text' : 'password'}
            hint={a.fields.passwordHint}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFieldMood(showPassword ? 'peeking' : 'hiding')}
            onBlur={() => setFieldMood('idle')}
            trailing={
              <RevealToggle
                shown={showPassword}
                label={showPassword ? a.fields.hidePassword : a.fields.showPassword}
                onToggle={() => {
                  const next = !showPassword;
                  setShowPassword(next);
                  setFieldMood(next ? 'peeking' : 'hiding');
                }}
              />
            }
            required
          />

          <SubmitButton busy={busy} onHoverMood={() => !busy && setFieldMood('cheering')}>
            {busy ? a.reset.submitting : a.reset.submit}
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
