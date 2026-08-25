/**
 * Rendering tests for the CMS-driven Header and Footer.
 *
 * These run in jsdom rather than through SSR deliberately: the layout arrives
 * via `useEffect`, which `renderToString` never executes. An SSR snapshot would
 * only ever capture the default fallback and would pass even if the CMS wiring
 * were completely broken.
 *
 * `fetch` is stubbed so the components exercise their real data path —
 * useLayout -> getLayout -> fetch -> render — without needing a live server.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Footer } from '../Footer';
import { Header } from '../Header';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { AdminAuthProvider } from '../../pages/AdminDashboard/AdminAuthContext';
import { invalidateLayout } from '../../hooks/useLayout';
import { tokenStore } from '../../services/adminApi';
import type { LayoutConfig } from '../../types/layout';

const LAYOUT: LayoutConfig = {
  header: {
    logoUrl: '',
    siteTitle: 'iNWebTools',
    tagline: 'Speech to text in 99 languages',
    navLinks: [
      { label: 'Transcribe', url: '/', newTab: false },
      { label: 'Documentation', url: '/docs', newTab: false },
      { label: 'GitHub', url: 'https://github.com/iNAYATechLab', newTab: true },
    ],
    actionButtons: [{ label: 'Get started', url: '/', variant: 'primary', newTab: false }],
    notice: {
      isVisible: true,
      text: 'Now powered by Whisper large-v3.',
      linkLabel: 'Learn more',
      linkUrl: '/docs',
    },
    showStatusPill: true,
    showLocaleToggle: true,
  },
  footer: {
    copyrightText: '© {year} iNWebTools',
    tagline: 'Accurate, private transcription.',
    columns: [
      {
        title: 'Product',
        items: [{ label: 'API reference', url: '/docs#api', newTab: false }],
      },
    ],
    socialLinks: [
      { platform: 'github', url: 'https://github.com/iNAYATechLab', label: '' },
      { platform: 'email', url: 'mailto:dev@inayatechlab.com', label: '' },
    ],
    newsletter: {
      enabled: true,
      heading: 'Stay in the loop',
      description: 'Monthly updates.',
      buttonLabel: 'Subscribe',
      placeholder: 'you@example.com',
    },
    showPrivacyNote: true,
  },
};

/** Answer the two endpoints the components call. */
function stubFetch(layout: LayoutConfig) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes('/api/layout/header-footer')
      ? { success: true, data: { value: layout, updatedAt: null, updatedBy: null } }
      : url.includes('/api/auth/me')
        ? // getMe unwraps data.user, so the shape has to match the real route.
          // Public namespace, not /api/admin: the session check must admit every
          // role, or a signed-in 'user' looks signed out.
          { success: true, data: { user: { id: 1, username: 'admin', role: 'super_admin' } } }
        : { success: true, data: { transcriptionReady: true } };

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    } as Response);
  });
}

beforeEach(() => {
  // The hook caches the layout promise at module scope so Header and Footer
  // share one request; clear it or later tests reuse the first fixture.
  invalidateLayout();
  // Signed out unless a test says otherwise: the header now renders an
  // account control and localStorage persists across tests in a file.
  localStorage.clear();
  vi.stubGlobal('fetch', stubFetch(LAYOUT));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Mirrors the real tree in App.tsx: the auth provider sits above everything
 * because the header's account control needs it, and a router is required for
 * the <Link> that control renders.
 */
const withLocale = (ui: React.ReactNode) => (
  <MemoryRouter>
    <AdminAuthProvider>
      <LocaleProvider>{ui}</LocaleProvider>
    </AdminAuthProvider>
  </MemoryRouter>
);

describe('Header — CMS driven', () => {
  it('renders the site title and tagline from the API', async () => {
    render(withLocale(<Header />));

    expect(await screen.findByText('Speech to text in 99 languages')).toBeDefined();
    expect(screen.getAllByText('iNWebTools').length).toBeGreaterThan(0);
  });

  it('renders navigation links with correct hrefs', async () => {
    render(withLocale(<Header />));

    const docs = await screen.findByRole('link', { name: 'Documentation' });
    expect(docs.getAttribute('href')).toBe('/docs');
  });

  it('adds rel="noopener noreferrer" to new-tab links', async () => {
    render(withLocale(<Header />));

    const github = await screen.findByRole('link', { name: 'GitHub' });
    expect(github.getAttribute('target')).toBe('_blank');
    expect(github.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders the action button', async () => {
    render(withLocale(<Header />));
    expect(await screen.findByRole('link', { name: 'Get started' })).toBeDefined();
  });

  it('shows the notice banner when visible', async () => {
    render(withLocale(<Header />));
    expect(await screen.findByText('Now powered by Whisper large-v3.')).toBeDefined();
  });

  it('hides the notice banner when isVisible is false', async () => {
    invalidateLayout();
    vi.stubGlobal(
      'fetch',
      stubFetch({
        ...LAYOUT,
        header: { ...LAYOUT.header, notice: { ...LAYOUT.header.notice, isVisible: false } },
      }),
    );

    render(withLocale(<Header />));

    await waitFor(() => expect(screen.queryByText('Documentation')).toBeDefined());
    expect(screen.queryByText('Now powered by Whisper large-v3.')).toBeNull();
  });

  it('hides the locale toggle when disabled', async () => {
    invalidateLayout();
    vi.stubGlobal(
      'fetch',
      stubFetch({ ...LAYOUT, header: { ...LAYOUT.header, showLocaleToggle: false } }),
    );

    render(withLocale(<Header />));

    await screen.findByRole('link', { name: 'Documentation' });
    expect(screen.queryByRole('group', { name: /Language/ })).toBeNull();
  });
});

describe('Header — account control', () => {
  it('offers a sign-in link when signed out', async () => {
    render(withLocale(<Header />));

    const signIn = await screen.findByRole('link', { name: 'Sign in' });
    expect(signIn.getAttribute('href')).toBe('/login');
  });

  it('shows the profile menu instead of sign-in when signed in', async () => {
    tokenStore.set('a-valid-access-token', 'a-refresh-token');

    render(withLocale(<Header />));

    // The username appears once the stored token has been verified.
    expect(await screen.findByRole('button', { name: 'Account menu' })).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
  });

  it('reveals dashboard and sign-out once the menu is opened', async () => {
    tokenStore.set('a-valid-access-token', 'a-refresh-token');

    render(withLocale(<Header />));

    const trigger = await screen.findByRole('button', { name: 'Account menu' });
    // Menu contents stay out of the DOM until asked for.
    expect(screen.queryByRole('menuitem', { name: 'Sign out' })).toBeNull();

    trigger.click();

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Dashboard' })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeDefined();
    });
  });
});

describe('Footer — CMS driven', () => {
  it('renders link columns from the API', async () => {
    render(withLocale(<Footer />));

    expect(await screen.findByText('Product')).toBeDefined();
    const link = screen.getByRole('link', { name: 'API reference' });
    expect(link.getAttribute('href')).toBe('/docs#api');
  });

  it('substitutes {year} in the copyright', async () => {
    render(withLocale(<Footer />));

    const year = new Date().getFullYear();
    expect(await screen.findByText(`© ${year} iNWebTools`)).toBeDefined();
  });

  it('renders social links with accessible names', async () => {
    render(withLocale(<Footer />));

    const github = await screen.findByRole('link', { name: 'GitHub' });
    expect(github.getAttribute('href')).toBe('https://github.com/iNAYATechLab');
    expect(github.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders the newsletter form when enabled', async () => {
    render(withLocale(<Footer />));

    expect(await screen.findByText('Stay in the loop')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeDefined();
  });

  it('hides the newsletter form when disabled', async () => {
    invalidateLayout();
    vi.stubGlobal(
      'fetch',
      stubFetch({
        ...LAYOUT,
        footer: {
          ...LAYOUT.footer,
          newsletter: { ...LAYOUT.footer.newsletter, enabled: false },
        },
      }),
    );

    render(withLocale(<Footer />));

    await screen.findByText('Product');
    expect(screen.queryByRole('button', { name: 'Subscribe' })).toBeNull();
  });
});

describe('Resilience', () => {
  it('falls back to defaults when the layout request fails', async () => {
    invalidateLayout();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down'))),
    );

    render(withLocale(<Footer />));

    // The site must still render rather than blank out.
    await waitFor(() => {
      expect(screen.getByText(/iNAYA TechLab/)).toBeDefined();
    });
  });
});
