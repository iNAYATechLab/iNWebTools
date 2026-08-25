/**
 * Regression cover for the "nothing happens on a correct password" bug.
 *
 * What users reported: a wrong password produced a clear error, but a correct
 * one appeared to do nothing at all — the form just sat there. The server logs
 * told a different story: `login_success` was recorded every time.
 *
 * The cause was the handoff. LoginPage stored the tokens, then called
 * `refresh()`, a *second* request (GET /api/auth/me) whose result was what
 * actually populated the session context. If that follow-up failed — a 403
 * from a stale bundle pointing at the staff-only /me, a dropped mobile
 * connection, or simply losing the race with the redirect — the context still
 * held `null`. The route guard then saw "not signed in" and bounced the user
 * back to /login, silently, with the tokens sitting in localStorage.
 *
 * The fix: /login already returns the authenticated account, so LoginPage
 * hands it to the context directly via `adopt()`. These tests pin down that a
 * confirmed sign-in survives every failure mode of that follow-up request.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminAuthProvider } from '../../AdminDashboard/AdminAuthContext';
import { LocaleProvider } from '../../../i18n/LocaleContext';
import { LoginPage } from '../LoginPage';
import { RequireUser } from '../RequireUser';

const USER = {
  id: 7,
  username: 'testuser',
  email: 'test@example.com',
  fullName: 'Test User',
  role: 'user',
  homePath: '/Dashboard',
};

const loginPayload = {
  success: true,
  data: {
    user: USER,
    redirectTo: '/Dashboard',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  },
};

const json = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

/**
 * A fetch where /login always succeeds and /me behaves however the test says.
 * That asymmetry is the whole point: the session must not depend on /me.
 */
function fetchWith(meBehaviour: () => Promise<Response>) {
  return vi.fn(async (url: string) => {
    if (String(url).includes('/api/auth/login')) return json(loginPayload);
    if (String(url).includes('/api/auth/me')) return meBehaviour();
    return json({ success: true, data: {} });
  });
}

const renderApp = (
  initialEntries: Array<string | { pathname: string; state?: unknown }> = ['/login'],
) =>
  render(
    <MemoryRouter initialEntries={initialEntries as never}>
      <AdminAuthProvider>
        <LocaleProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/Dashboard"
              element={
                <RequireUser>
                  <span>User dashboard</span>
                </RequireUser>
              }
            />
          </Routes>
        </LocaleProvider>
      </AdminAuthProvider>
    </MemoryRouter>,
  );

async function submitCorrectCredentials() {
  fireEvent.change(await screen.findByLabelText(/username or email/i), {
    target: { value: 'testuser' },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: 'correct-horse' },
  });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('inwebtools.locale', 'en');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('sign-in handoff', () => {
  it('reaches the dashboard when the follow-up /me succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      fetchWith(async () => json({ success: true, data: { user: USER } })),
    );

    renderApp();
    await submitCorrectCredentials();

    expect(await screen.findByText('User dashboard')).toBeTruthy();
  });

  it('still reaches the dashboard when /me is refused with 403', async () => {
    // A stale bundle asking the staff-only /me used to strand a valid 'user'
    // session on the login form.
    vi.stubGlobal(
      'fetch',
      fetchWith(async () =>
        json({ success: false, error: { code: 'FORBIDDEN', message: 'Staff only.' } }, 403),
      ),
    );

    renderApp();
    await submitCorrectCredentials();

    expect(await screen.findByText('User dashboard')).toBeTruthy();
  });

  it('still reaches the dashboard when /me fails at the network level', async () => {
    vi.stubGlobal(
      'fetch',
      fetchWith(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    renderApp();
    await submitCorrectCredentials();

    expect(await screen.findByText('User dashboard')).toBeTruthy();
  });

  it('stores the tokens it was given', async () => {
    vi.stubGlobal(
      'fetch',
      fetchWith(async () => json({ success: true, data: { user: USER } })),
    );

    renderApp();
    await submitCorrectCredentials();

    await waitFor(() =>
      expect(localStorage.getItem('inwebtools.admin.access')).toBe('access-token'),
    );
    expect(localStorage.getItem('inwebtools.admin.refresh')).toBe('refresh-token');
  });

  it('reports a wrong password instead of failing silently', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(
          {
            success: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect username or password.' },
          },
          401,
        ),
      ),
    );

    renderApp();
    await submitCorrectCredentials();

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('User dashboard')).toBeNull();
  });
});

describe('guard redirect', () => {
  it('explains why it sent the user to /login', async () => {
    // The bounce used to be silent, which is indistinguishable from a dead
    // button. Arriving with reason: 'session' must produce a visible notice.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ success: true, data: {} })),
    );

    renderApp([{ pathname: '/login', state: { from: '/Dashboard', reason: 'session' } }]);

    const notice = await screen.findByRole('status');
    expect(notice.textContent).toMatch(/session/i);
  });

  it('shows no notice on an ordinary visit to /login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ success: true, data: {} })),
    );

    renderApp();

    await screen.findByRole('button', { name: /sign in/i });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
