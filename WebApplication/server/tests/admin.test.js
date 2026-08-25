/**
 * Tests for the admin dashboard API.
 *
 * These run with DB_ENABLED=false (the default under NODE_ENV=test), which is
 * the important contract to pin down: the dashboard is optional, so when its
 * database is absent every /api/admin route must degrade to a clean 503 while
 * the public transcription API keeps working. Nothing here needs a live MySQL,
 * so the suite stays deterministic in CI.
 *
 * The role guard is exercised directly, since reaching it over HTTP would
 * require a database-backed session.
 */

import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../index.js');
const { requireRole } = await import('../middlewares/adminAuth.js');

/** Every route below the auth boundary, as the dashboard calls them. */
const GUARDED_ROUTES = [
  ['get', '/api/admin/auth/me'],
  ['get', '/api/admin/userinfo/online-now'],
  ['get', '/api/admin/userinfo/online-now/some-session-id'],
  ['get', '/api/admin/userinfo/time-range-stats?range=today'],
  ['get', '/api/admin/logs/conversions'],
  ['get', '/api/admin/logs/system-errors'],
  ['patch', '/api/admin/logs/system-errors/1'],
  ['get', '/api/admin/settings/limits'],
  ['put', '/api/admin/settings/limits'],
  ['get', '/api/admin/settings/notice'],
  ['put', '/api/admin/settings/notice'],
  ['get', '/api/admin/security/admin-access'],
  ['post', '/api/admin/security/password'],
];

describe('admin API — database unavailable', () => {
  it.each(GUARDED_ROUTES)('%s %s replies 503 DATABASE_UNAVAILABLE', async (method, url) => {
    const res = await request(app)[method](url);

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
  });

  it('says plainly that transcription is unaffected', async () => {
    const res = await request(app).get('/api/admin/userinfo/online-now');
    expect(res.body.error.message).toMatch(/transcription api is unaffected/i);
  });

  it('rejects login with 503 rather than leaking that the user is unknown', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: 'admin', password: 'whatever' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
  });

  it('keeps the public health endpoint reporting the dashboard as not ready', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.databaseReady).toBe(false);
  });

  it('does not break the public transcription route', async () => {
    // No file attached: the ordinary validation error, not a database error.
    const res = await request(app).post('/api/transcribe');

    expect(res.status).toBe(400);
    expect(res.body.error.code).not.toBe('DATABASE_UNAVAILABLE');
  });

  it('applies the database guard before route matching, so unknown paths do not probe the router', async () => {
    // 503 rather than 404 is deliberate: the guard is mounted ahead of the
    // routes, so an unauthenticated caller cannot map which admin endpoints
    // exist by diffing status codes.
    const res = await request(app).get('/api/admin/nope');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
  });
});

describe('admin API — response envelope', () => {
  it('uses the same { success, error, meta } shape as the public API', async () => {
    const res = await request(app).get('/api/admin/settings/limits');

    expect(res.body).toMatchObject({
      success: false,
      error: { code: expect.any(String), message: expect.any(String) },
      meta: { requestId: expect.any(String), timestamp: expect.any(String) },
    });
  });

  it('never echoes an Authorization header back to the caller', async () => {
    const secret = 'Bearer super-secret-token-value';
    const res = await request(app).get('/api/admin/auth/me').set('Authorization', secret);

    expect(JSON.stringify(res.body)).not.toContain('super-secret-token-value');
  });
});

describe('requireRole', () => {
  const run = (admin, roles) => {
    const next = vi.fn();
    requireRole(...roles)({ admin }, {}, next);
    return next.mock.calls[0]?.[0];
  };

  it('passes a permitted role through', () => {
    expect(
      run({ id: 1, username: 'a', role: 'super_admin' }, ['super_admin', 'admin']),
    ).toBeUndefined();
  });

  it('rejects a role that is not listed with 403', () => {
    const err = run({ id: 2, username: 'v', role: 'user' }, ['super_admin', 'admin']);

    expect(err).toBeDefined();
    expect(err.statusCode ?? err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('rejects an unauthenticated request with 401', () => {
    const err = run(undefined, ['super_admin']);

    expect(err).toBeDefined();
    expect(err.statusCode ?? err.status).toBe(401);
    expect(err.code).toBe('AUTH_REQUIRED');
  });
});
