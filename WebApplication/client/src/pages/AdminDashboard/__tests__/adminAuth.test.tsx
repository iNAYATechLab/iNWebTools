/**
 * Regression cover for the session guard.
 *
 * The bug these pin down: StrictMode mounts effects twice in development, so
 * the verification request from the first mount is always aborted. The abort
 * was being caught as "session rejected", which cleared the tokens that the
 * second mount had just validated. The dashboard then rendered the login
 * screen, and any request that did go out carried no Authorization header —
 * so the server answered with AUTH_REQUIRED, "Sign in to access the admin
 * dashboard", even though the operator had just signed in successfully.
 */

import { StrictMode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminAuthProvider } from '../AdminAuthContext';
import { RequireAdmin } from '../RequireAdmin';
import { tokenStore } from '../../../services/adminApi';

const USER = { id: 1, username: 'admin', role: 'super_admin' };

/** A fetch that resolves on a later tick, so aborts can land first. */
function deferredFetch(respond: () => unknown, status = 200) {
  return vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => resolve({ ok: status < 400, status, json: async () => respond() } as Response),
          10,
        );
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
  );
}

/**
 * Mirrors the real tree. RequireAdmin redirects to /login rather than
 * rendering a sign-in form of its own, so the router needs somewhere for that
 * redirect to land — "Login page" standing in for the shared page.
 */
const renderGuarded = () =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/AdminDashboard']}>
        <AdminAuthProvider>
          <Routes>
            <Route path="/login" element={<span>Login page</span>} />
            <Route path="/Dashboard" element={<span>User dashboard</span>} />
            <Route
              path="/AdminDashboard"
              element={
                <RequireAdmin>
                  <span>Dashboard content</span>
                </RequireAdmin>
              }
            />
          </Routes>
        </AdminAuthProvider>
      </MemoryRouter>
    </StrictMode>,
  );

beforeEach(() => localStorage.clear());
afterEach(() => {
  // `globals: false`, so Testing Library's auto-cleanup is not installed;
  // without this each render would stack up in the same document.
  cleanup();
  vi.unstubAllGlobals();
});

describe('AdminAuthProvider session restore', () => {
  it('keeps a valid session through StrictMode double-mounting', async () => {
    tokenStore.set('access-token', 'refresh-token');
    vi.stubGlobal(
      'fetch',
      deferredFetch(() => ({ success: true, data: { user: USER } })),
    );

    renderGuarded();

    expect(await screen.findByText('Dashboard content')).toBeTruthy();
    expect(tokenStore.access).toBe('access-token');
  });

  it('sends the token on the verification request', async () => {
    tokenStore.set('access-token', 'refresh-token');
    const fetchMock = deferredFetch(() => ({ success: true, data: { user: USER } }));
    vi.stubGlobal('fetch', fetchMock);

    renderGuarded();
    await screen.findByText('Dashboard content');

    const headers = fetchMock.mock.calls.at(-1)?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer access-token');
  });

  it('still signs out when the server actually rejects the token', async () => {
    tokenStore.set('stale-token', 'stale-refresh');
    vi.stubGlobal(
      'fetch',
      deferredFetch(
        () => ({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Sign in.' } }),
        401,
      ),
    );

    renderGuarded();

    await waitFor(() => expect(screen.getByText('Login page')).toBeTruthy());
    expect(tokenStore.access).toBeNull();
  });

  it('does not discard the session on a transient network error', async () => {
    tokenStore.set('access-token', 'refresh-token');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    renderGuarded();

    await waitFor(() => expect(screen.getByText('Login page')).toBeTruthy());
    // The server never refused it, so the credentials survive for a retry.
    expect(tokenStore.access).toBe('access-token');
  });

  it('shows the login screen when there is no token at all', async () => {
    vi.stubGlobal(
      'fetch',
      deferredFetch(() => ({ success: true, data: { user: USER } })),
    );

    renderGuarded();

    await waitFor(() => expect(screen.getByText('Login page')).toBeTruthy());
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('RequireAdmin routing', () => {
  /**
   * The dashboard used to render its own sign-in form. Signing in at /login
   * and then opening /AdminDashboard met that second form again, which read
   * as being bounced back to the login page. The guard now redirects to the
   * one shared page instead.
   */
  it('sends an anonymous visitor to the shared login page', async () => {
    vi.stubGlobal(
      'fetch',
      deferredFetch(() => ({ success: true, data: { user: USER } })),
    );

    renderGuarded();

    await waitFor(() => expect(screen.getByText('Login page')).toBeTruthy());
    // No second sign-in form of its own any more.
    expect(screen.queryByLabelText(/password/i)).toBeNull();
  });

  it('sends a signed-in non-staff account to its own dashboard, not to login', async () => {
    tokenStore.set('access-token', 'refresh-token');
    vi.stubGlobal(
      'fetch',
      deferredFetch(() => ({
        success: true,
        data: { user: { id: 9, username: 'member', role: 'user' } },
      })),
    );

    renderGuarded();

    // Redirecting them to /login would loop: they are already signed in.
    await waitFor(() => expect(screen.getByText('User dashboard')).toBeTruthy());
    expect(screen.queryByText('Login page')).toBeNull();
  });

  it('lets staff through to the dashboard', async () => {
    tokenStore.set('access-token', 'refresh-token');
    vi.stubGlobal(
      'fetch',
      deferredFetch(() => ({ success: true, data: { user: USER } })),
    );

    renderGuarded();

    expect(await screen.findByText('Dashboard content')).toBeTruthy();
  });
});

describe('token refresh on a rejected access token', () => {
  /**
   * The refresh path used to trigger only on TOKEN_EXPIRED. The server also
   * answers TOKEN_INVALID (restart with a new key, truncated localStorage
   * value, token from another environment) and AUTH_REQUIRED. Those dropped
   * straight to the login screen even though the refresh token was still
   * good — the operator signed in and was bounced right back out.
   */
  const cases = ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'AUTH_REQUIRED'] as const;

  for (const code of cases) {
    it(`refreshes and replays after a 401 ${code}`, async () => {
      tokenStore.set('stale-token', 'good-refresh');

      const fetchMock = vi.fn(async (url: string) => {
        if (String(url).includes('/auth/refresh')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: { accessToken: 'fresh-token', refreshToken: 'fresh-refresh' },
            }),
          } as Response;
        }
        // Reject the stale token, accept the refreshed one.
        const usedFresh = tokenStore.access === 'fresh-token';
        return {
          ok: usedFresh,
          status: usedFresh ? 200 : 401,
          json: async () =>
            usedFresh
              ? { success: true, data: { user: USER } }
              : { success: false, error: { code, message: 'nope' } },
        } as Response;
      });
      vi.stubGlobal('fetch', fetchMock);

      renderGuarded();

      expect(await screen.findByText('Dashboard content')).toBeTruthy();
      expect(tokenStore.access).toBe('fresh-token');
    });
  }

  it('gives up when there is no refresh token to fall back on', async () => {
    localStorage.setItem('inwebtools.admin.access', 'stale-token');

    vi.stubGlobal(
      'fetch',
      deferredFetch(
        () => ({ success: false, error: { code: 'TOKEN_INVALID', message: 'nope' } }),
        401,
      ),
    );

    renderGuarded();

    await waitFor(() => expect(screen.getByText('Login page')).toBeTruthy());
    expect(tokenStore.access).toBeNull();
  });
});
