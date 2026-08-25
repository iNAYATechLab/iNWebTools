/**
 * Rendering tests for the widget engine.
 *
 * These run in jsdom rather than through SSR deliberately: the config arrives
 * via `useEffect`, which `renderToString` never executes. An SSR snapshot would
 * only ever capture the empty fallback and would pass even if the engine were
 * completely unwired.
 *
 * `fetch` is stubbed so the components exercise their real data path —
 * useWidgetConfig -> getWidgetConfig -> fetch -> registry -> render — without
 * needing a live server.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../../i18n/LocaleContext';
import { invalidateWidgetConfig } from '../../../hooks/useWidgetConfig';
import { isKnownWidgetType, resolveWidget } from '../registry';
import { SidebarZone } from '../SidebarZone';
import type { WidgetConfig, WidgetInstance } from '../../../types/widgets';

const widget = (over: Partial<WidgetInstance> = {}): WidgetInstance => ({
  id: 'w1',
  type: 'text_html',
  title: 'Notice',
  settings: { body: '<p>Hello sidebar</p>', align: 'left' },
  enabled: true,
  position: 0,
  ...over,
});

const CONFIG: WidgetConfig = {
  zones: {
    left: [widget({ id: 'left1', title: 'Left block' })],
    right: [
      widget({
        id: 'right1',
        type: 'system_stats',
        title: 'Status',
        settings: { showModel: true, showUptime: true, showTotals: false, refreshSeconds: 60 },
      }),
    ],
  },
};

function stubFetch(config: WidgetConfig) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/widgets/config')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { value: config, updatedAt: null, updatedBy: null },
            meta: {},
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.includes('/api/widgets/public-stats')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              model: 'openai/whisper-large-v3-turbo',
              version: '0.1.0-alpha.1',
              uptimeSeconds: 7_265,
              online: null,
              totals: null,
            },
            meta: {},
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }),
  );
}

beforeEach(() => {
  invalidateWidgetConfig();
  stubFetch(CONFIG);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('widget registry', () => {
  it('maps every catalogue type the server ships', () => {
    for (const type of [
      'text_html',
      'image_banner',
      'online_users',
      'recent_transcriptions',
      'quick_tools',
      'system_stats',
    ]) {
      expect(isKnownWidgetType(type)).toBe(true);
    }
  });

  it('resolves an unknown type to a placeholder instead of throwing', () => {
    // A cached SPA can outlive a deploy that added a widget type. Rendering
    // the rest of the page is the right behaviour, not a crash.
    expect(isKnownWidgetType('from_the_future')).toBe(false);

    const Component = resolveWidget('from_the_future');
    render(<Component widget={widget({ type: 'from_the_future' })} />);

    expect(screen.getByText(/cannot render/i)).toBeTruthy();
  });
});

describe('SidebarZone', () => {
  it('renders enabled widgets in order', () => {
    render(
      <SidebarZone
        label="Left sidebar"
        widgets={[widget({ id: 'a', title: 'First' }), widget({ id: 'b', title: 'Second' })]}
      />,
    );

    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
  });

  it('does not mount disabled widgets at all', () => {
    // Not merely hidden with CSS: a disabled stats widget must stop polling,
    // which only happens if the component never mounts.
    render(
      <SidebarZone
        label="Left sidebar"
        widgets={[
          widget({ id: 'a', title: 'Visible' }),
          widget({ id: 'b', title: 'Hidden', enabled: false }),
        ]}
      />,
    );

    expect(screen.getByText('Visible')).toBeTruthy();
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('renders nothing when every widget is disabled', () => {
    const { container } = render(
      <SidebarZone label="Left sidebar" widgets={[widget({ enabled: false })]} />,
    );

    // An empty <aside> would still occupy a grid track and push the
    // transcriber off-centre, so the zone must disappear entirely.
    expect(container.querySelector('aside')).toBeNull();
  });
});

describe('TextHtmlWidget', () => {
  it('renders sanitised HTML from settings', () => {
    const Component = resolveWidget('text_html');
    render(
      <Component widget={widget({ settings: { body: '<p>Hello <strong>there</strong></p>' } })} />,
    );

    expect(screen.getByText('there')).toBeTruthy();
  });

  it('shows a placeholder when the block has no content', () => {
    const Component = resolveWidget('text_html');
    render(<Component widget={widget({ settings: { body: '' } })} />);

    expect(screen.getByText(/no content yet/i)).toBeTruthy();
  });
});

describe('SystemStatsWidget', () => {
  it('shows the model and a formatted uptime from the shared stats poll', async () => {
    const Component = resolveWidget('system_stats');
    render(
      <Component
        widget={widget({
          type: 'system_stats',
          title: 'Status',
          settings: { showModel: true, showUptime: true, showTotals: false, refreshSeconds: 60 },
        })}
      />,
    );

    // The org prefix is trimmed: a sidebar is too narrow for the full id.
    await waitFor(() => expect(screen.getByText('whisper-large-v3-turbo')).toBeTruthy());
    // 7265s -> "2h 1m"
    expect(screen.getByText('2h 1m')).toBeTruthy();
  });
});

describe('QuickToolsWidget', () => {
  it('renders the interface language toggle inside a locale provider', () => {
    const Component = resolveWidget('quick_tools');
    render(
      <LocaleProvider>
        <Component
          widget={widget({
            type: 'quick_tools',
            title: 'Quick tools',
            settings: {
              showLocaleToggle: true,
              showAudioLanguages: true,
              languageCodes: 'auto,bn,en',
              showCopyLink: false,
            },
          })}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText(/Interface language/i)).toBeTruthy();
    expect(screen.getByText(/Audio language/i)).toBeTruthy();
  });
});
