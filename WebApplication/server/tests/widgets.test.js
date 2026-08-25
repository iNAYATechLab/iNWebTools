/**
 * Tests for the sidebar widget engine.
 *
 * The priorities here are the same as the header/footer CMS, plus one more
 * that is specific to this feature:
 *
 *   1. The public GET stays public and degrades to defaults when the database
 *      is unavailable — a widget outage must not blank the website.
 *   2. The POST is NOT public. It shares the /api/widgets prefix with the GET,
 *      which makes it easy to assume it inherits that openness; it must reject
 *      unauthenticated callers or it becomes a defacement endpoint.
 *   3. The HTML sanitiser actually strips what it claims to. This widget
 *      engine is the only place in the product that renders admin-authored
 *      markup with dangerouslySetInnerHTML, so the sanitiser is load-bearing
 *      security code rather than a nicety. It is tested directly because
 *      reaching it over HTTP would need a database-backed admin session.
 *   4. `public-stats` exposes aggregates only. A regression that leaked
 *      session ids or IP addresses onto the public site would be silent
 *      without a test pinning the shape.
 */

import request from 'supertest';
import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../index.js');
const {
  DEFAULT_WIDGET_CONFIG,
  WIDGET_CATALOGUE,
  WIDGET_TYPES,
  defaultSettingsFor,
  sanitiseHtmlFragment,
  sanitiseWidgetConfig,
} = await import('../services/widgets.service.js');

/* ------------------------------------------------------------------ *
 * Public read
 * ------------------------------------------------------------------ */

describe('GET /api/widgets/config', () => {
  it('is public and answers 200 without a token', async () => {
    const res = await request(app).get('/api/widgets/config');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.value.zones.left).toBeInstanceOf(Array);
    expect(res.body.data.value.zones.right).toBeInstanceOf(Array);
  });

  it('falls back to defaults when the database is unavailable', async () => {
    // DB_ENABLED=false under NODE_ENV=test, so this is the degraded path.
    const res = await request(app).get('/api/widgets/config');

    expect(res.status).toBe(200);
    expect(res.body.meta.source).toBe('defaults');
    expect(res.body.data.value).toEqual(DEFAULT_WIDGET_CONFIG);
  });
});

describe('GET /api/widgets/catalogue', () => {
  it('lists every widget type with a settings schema', async () => {
    const res = await request(app).get('/api/widgets/catalogue');

    expect(res.status).toBe(200);
    expect(res.body.data.zones).toEqual(['left', 'right']);
    expect(res.body.data.widgets).toHaveLength(WIDGET_TYPES.length);

    for (const definition of res.body.data.widgets) {
      expect(definition.type).toBeTruthy();
      expect(definition.name).toBeTruthy();
      expect(definition.fields).toBeInstanceOf(Array);
      // The admin form is generated from these, so each field needs the parts
      // the renderer switches on.
      for (const field of definition.fields) {
        expect(field.key).toBeTruthy();
        expect(field.kind).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect(field).toHaveProperty('default');
      }
    }
  });

  it('declares the six required warehouse widgets', () => {
    expect(WIDGET_TYPES).toEqual(
      expect.arrayContaining([
        'text_html',
        'image_banner',
        'online_users',
        'recent_transcriptions',
        'quick_tools',
        'system_stats',
      ]),
    );
  });
});

/* ------------------------------------------------------------------ *
 * Auth boundary
 * ------------------------------------------------------------------ */

describe('POST /api/widgets/config — auth boundary', () => {
  it('rejects an unauthenticated write', async () => {
    const res = await request(app)
      .post('/api/widgets/config')
      .send({ zones: { left: [], right: [] } });

    expect(res.status).not.toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('rejects a bearer token that is not a valid admin token', async () => {
    const res = await request(app)
      .post('/api/widgets/config')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ zones: { left: [], right: [] } });

    expect(res.status).not.toBe(200);
    expect(res.body.success).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * HTML sanitising — the stored-XSS defence
 * ------------------------------------------------------------------ */

describe('sanitiseHtmlFragment', () => {
  it('keeps formatting tags an admin would legitimately use', () => {
    const html = sanitiseHtmlFragment(
      '<p>Hello <strong>world</strong> and <em>friends</em></p><ul><li>one</li></ul>',
    );

    expect(html).toContain('<strong>world</strong>');
    expect(html).toContain('<em>friends</em>');
    expect(html).toContain('<li>one</li>');
  });

  it('strips script tags and their contents', () => {
    const html = sanitiseHtmlFragment('<p>safe</p><script>alert(document.cookie)</script>');

    expect(html).toContain('safe');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert');
  });

  it('strips inline event handlers', () => {
    const html = sanitiseHtmlFragment('<img src="x" onerror="alert(1)"><p onclick="steal()">t</p>');

    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('alert(1)');
  });

  it('strips javascript: URLs from links', () => {
    // React escapes text but will happily render a javascript: href, so this
    // is the actual defence rather than a formality.
    const html = sanitiseHtmlFragment('<a href="javascript:alert(1)">click</a>');

    expect(html).not.toContain('javascript:');
  });

  it('strips iframes, styles, forms and inputs', () => {
    const html = sanitiseHtmlFragment(
      '<iframe src="https://evil.example"></iframe>' +
        '<style>body{display:none}</style>' +
        '<form action="/steal"><input name="password"></form>',
    );

    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<style');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('<input');
  });

  it('forces noopener on links that open a new tab', () => {
    // Without noopener the opened page can navigate this one via window.opener.
    const html = sanitiseHtmlFragment('<a href="https://ok.example" target="_blank">go</a>');

    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('allows safe absolute and relative links', () => {
    const html = sanitiseHtmlFragment(
      '<a href="https://ok.example">a</a><a href="/docs">b</a><a href="mailto:x@y.z">c</a>',
    );

    expect(html).toContain('https://ok.example');
    expect(html).toContain('/docs');
    expect(html).toContain('mailto:x@y.z');
  });
});

/* ------------------------------------------------------------------ *
 * Document sanitising
 * ------------------------------------------------------------------ */

describe('sanitiseWidgetConfig', () => {
  it('drops widgets whose type is not in the catalogue', () => {
    const config = sanitiseWidgetConfig({
      zones: {
        left: [
          { id: 'a', type: 'text_html', title: 'Keep' },
          { id: 'b', type: 'evil_remote_exec', title: 'Drop' },
        ],
      },
    });

    expect(config.zones.left).toHaveLength(1);
    expect(config.zones.left[0].type).toBe('text_html');
  });

  it('renumbers position from array order', () => {
    // Array order is what the admin sees; a stale `position` from the client
    // must never win over it.
    const config = sanitiseWidgetConfig({
      zones: {
        left: [
          { id: 'a', type: 'text_html', position: 99 },
          { id: 'b', type: 'system_stats', position: 3 },
          { id: 'c', type: 'quick_tools', position: 0 },
        ],
      },
    });

    expect(config.zones.left.map((w) => w.position)).toEqual([0, 1, 2]);
    expect(config.zones.left.map((w) => w.id)).toEqual(['a', 'b', 'c']);
  });

  it('replaces duplicate ids rather than rejecting the whole document', () => {
    // Ids are React keys and drag ids; duplicates would make two widgets move
    // as one. Losing the admin's entire layout over a client bug is worse.
    const config = sanitiseWidgetConfig({
      zones: {
        left: [
          { id: 'dup', type: 'text_html' },
          { id: 'dup', type: 'system_stats' },
        ],
        right: [{ id: 'dup', type: 'quick_tools' }],
      },
    });

    const ids = [...config.zones.left, ...config.zones.right].map((w) => w.id);
    expect(new Set(ids).size).toBe(3);
    expect(config.zones.left).toHaveLength(2);
    expect(config.zones.right).toHaveLength(1);
  });

  it('drops unknown settings keys and fills missing ones from defaults', () => {
    const config = sanitiseWidgetConfig({
      zones: {
        left: [
          {
            id: 'a',
            type: 'system_stats',
            settings: { showModel: false, __proto__polluted: 'x', bogus: 'y' },
          },
        ],
      },
    });

    const settings = config.zones.left[0].settings;
    expect(settings.showModel).toBe(false);
    expect(settings).not.toHaveProperty('bogus');
    expect(settings).not.toHaveProperty('__proto__polluted');
    // Untouched fields come back at their declared defaults.
    expect(settings.showUptime).toBe(defaultSettingsFor('system_stats').showUptime);
  });

  it('clamps numeric settings into their declared range', () => {
    const config = sanitiseWidgetConfig({
      zones: {
        left: [
          { id: 'a', type: 'online_users', settings: { refreshSeconds: 99_999 } },
          { id: 'b', type: 'online_users', settings: { refreshSeconds: -5 } },
        ],
      },
    });

    const field = WIDGET_CATALOGUE.online_users.fields.find((f) => f.key === 'refreshSeconds');
    expect(config.zones.left[0].settings.refreshSeconds).toBe(field.max);
    expect(config.zones.left[1].settings.refreshSeconds).toBe(field.min);
  });

  it('rejects unsafe URLs in image and link settings', () => {
    const config = sanitiseWidgetConfig({
      zones: {
        left: [
          {
            id: 'a',
            type: 'image_banner',
            settings: {
              imageUrl: 'javascript:alert(1)',
              linkUrl: 'vbscript:msgbox(1)',
            },
          },
        ],
      },
    });

    expect(config.zones.left[0].settings.imageUrl).toBe('');
    expect(config.zones.left[0].settings.linkUrl).toBe('');
  });

  it('caps the number of widgets per zone', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `w${i}`, type: 'text_html' }));
    const config = sanitiseWidgetConfig({ zones: { left: many } });

    expect(config.zones.left.length).toBeLessThanOrEqual(12);
  });

  it('tolerates junk input without throwing', () => {
    // The document is admin-written but arrives over HTTP; a malformed body
    // must produce an empty layout, not a 500.
    for (const junk of [null, undefined, 'string', 42, [], { zones: 'nope' }]) {
      const config = sanitiseWidgetConfig(junk);
      expect(config.zones.left).toEqual([]);
      expect(config.zones.right).toEqual([]);
    }
  });

  it('sanitises HTML inside a stored text widget', () => {
    const config = sanitiseWidgetConfig({
      zones: {
        left: [
          {
            id: 'a',
            type: 'text_html',
            settings: { body: '<p>ok</p><script>alert(1)</script>' },
          },
        ],
      },
    });

    expect(config.zones.left[0].settings.body).toContain('ok');
    expect(config.zones.left[0].settings.body).not.toContain('script');
  });
});

/* ------------------------------------------------------------------ *
 * Public stats — what must NOT be in the payload
 * ------------------------------------------------------------------ */

describe('GET /api/widgets/public-stats', () => {
  it('is public and returns runtime information', async () => {
    const res = await request(app).get('/api/widgets/public-stats');

    expect(res.status).toBe(200);
    expect(res.body.data.model).toBeTruthy();
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
  });

  it('exposes aggregates only — never per-visitor detail', async () => {
    const res = await request(app).get('/api/widgets/public-stats');
    const body = JSON.stringify(res.body);

    // These are the fields the admin online-now view carries. None of them
    // belong on a public endpoint, so assert on the serialised payload rather
    // than a shape check that a nested addition could slip past.
    for (const leaked of [
      'session_id',
      'sessionId',
      'ip_address',
      'ipAddress',
      'user_agent',
      'userAgent',
      'country_code',
    ]) {
      expect(body).not.toContain(leaked);
    }
  });

  it('degrades to nulls rather than failing when the database is down', async () => {
    const res = await request(app).get('/api/widgets/public-stats');

    expect(res.status).toBe(200);
    expect(res.body.data.online).toBeNull();
    expect(res.body.data.totals).toBeNull();
  });
});
