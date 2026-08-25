import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  AuthLink,
  AuthShell,
  Banner,
  Field,
  RevealToggle,
  SubmitButton,
} from '../../components/auth/AuthShell';
import { useCharacterMood } from '../../hooks/useCharacterMood';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useLocale } from '../../hooks/useLocale';
import * as adminApi from '../../services/adminApi';

export function LoginPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const { adopt } = useAdminAuth();

  // A guard that turned us away records where it was headed, so signing in
  // resumes that journey instead of dumping everyone on the same landing page.
  const state = location.state as { from?: string; reason?: string } | null;
  const from = state?.from;
  const { mood, setFieldMood, latch } = useCharacterMood();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const a = t.auth;

  // A guard sent them here because the session was missing or had expired.
  // Saying so is the difference between "the site is broken" and "sign in
  // again" — previously this redirect arrived with no explanation at all.
  const notice = state?.reason === 'session' ? a.errors.sessionExpired : null;

  // What the character says, following its mood.
  const speech =
    mood === 'watching'
      ? a.speech.identifier
      : mood === 'hiding'
        ? a.speech.password
        : mood === 'peeking'
          ? a.speech.peeking
          : mood === 'cheering'
            ? a.speech.welcome
            : mood === 'sad'
              ? a.speech.tryAgain
              : a.speech.greeting;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    latch(null);

    try {
      const result = await adminApi.signIn(identifier.trim(), password);
      latch('cheering');

      // The response already contains the authenticated account, so hand it
      // straight to the shared context. This used to `await refresh()` — a
      // second GET /me whose failure left the context empty while the tokens
      // were stored, so the route guard bounced the user back here silently.
      adopt(result.user);

      // Back to the page they were trying to reach, or the home the server
      // picked for their role.
      navigate(from ?? result.redirectTo ?? result.user.homePath ?? '/', { replace: true });
    } catch (err) {
      latch('sad');
      setError(err instanceof adminApi.AdminApiError ? err.message : a.errors.network);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      mood={mood}
      speech={speech}
      title={a.login.title}
      subtitle={a.login.subtitle}
      footer={
        <div className="space-y-1.5">
          <p>
            {a.login.noAccount} <AuthLink to="/register">{a.login.registerLink}</AuthLink>
          </p>
          <p>
            <AuthLink to="/forgot-password">{a.login.forgotLink}</AuthLink>
          </p>
        </div>
      }
    >
      {error && <Banner tone="error">{error}</Banner>}
      {!error && notice && <Banner tone="info">{notice}</Banner>}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          name="identifier"
          label={a.fields.identifier}
          hint={a.fields.identifierHint}
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onFocus={() => setFieldMood('watching')}
          onBlur={() => setFieldMood('idle')}
          required
        />

        <Field
          name="password"
          label={a.fields.password}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          // The character only hides its eyes while the text is masked —
          // once the user reveals it themselves, the joke is over.
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
          {busy ? a.login.submitting : a.login.submit}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
