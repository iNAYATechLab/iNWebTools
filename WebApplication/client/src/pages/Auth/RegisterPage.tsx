import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

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

export function RegisterPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { adopt } = useAdminAuth();
  const { mood, setFieldMood, latch } = useCharacterMood();

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const a = t.auth;
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const speech =
    mood === 'watching'
      ? a.speech.register
      : mood === 'hiding'
        ? a.speech.password
        : mood === 'peeking'
          ? a.speech.peeking
          : mood === 'cheering'
            ? a.speech.created
            : mood === 'sad'
              ? a.speech.checkFields
              : a.speech.registerGreeting;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    setFields({});
    latch(null);

    try {
      const result = await adminApi.signUp({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim() || undefined,
      });
      latch('cheering');
      // Adopt the account the server just created rather than re-fetching it;
      // a failed follow-up GET /me would otherwise leave the guard thinking
      // nobody is signed in and bounce the new user straight back here.
      adopt(result.user);
      navigate(result.redirectTo ?? result.user.homePath ?? '/', { replace: true });
    } catch (err) {
      latch('sad');
      if (err instanceof adminApi.AdminApiError) {
        setFields(err.fields);
        // With per-field messages on screen, a banner repeating them is noise.
        setError(Object.keys(err.fields).length > 0 ? null : err.message);
      } else {
        setError(a.errors.network);
      }
      setBusy(false);
    }
  }

  return (
    <AuthShell
      mood={mood}
      speech={speech}
      title={a.register.title}
      subtitle={a.register.subtitle}
      footer={
        <p>
          {a.register.haveAccount} <AuthLink to="/login">{a.register.loginLink}</AuthLink>
        </p>
      }
    >
      {error && <Banner tone="error">{error}</Banner>}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          name="fullName"
          label={a.fields.fullName}
          hint={a.fields.optional}
          autoComplete="name"
          value={form.fullName}
          onChange={(e) => set('fullName')(e.target.value)}
          onFocus={() => setFieldMood('watching')}
          onBlur={() => setFieldMood('idle')}
          error={fields.fullName}
        />

        <Field
          name="username"
          label={a.fields.username}
          hint={a.fields.usernameHint}
          autoComplete="username"
          value={form.username}
          onChange={(e) => set('username')(e.target.value)}
          onFocus={() => setFieldMood('watching')}
          onBlur={() => setFieldMood('idle')}
          error={fields.username}
          required
        />

        <Field
          name="email"
          label={a.fields.email}
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => set('email')(e.target.value)}
          onFocus={() => setFieldMood('watching')}
          onBlur={() => setFieldMood('idle')}
          error={fields.email}
          required
        />

        <Field
          name="password"
          label={a.fields.password}
          type={showPassword ? 'text' : 'password'}
          hint={a.fields.passwordHint}
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => set('password')(e.target.value)}
          onFocus={() => setFieldMood(showPassword ? 'peeking' : 'hiding')}
          onBlur={() => setFieldMood('idle')}
          error={fields.password}
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
          {busy ? a.register.submitting : a.register.submit}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
