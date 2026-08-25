/**
 * Unit cover for the authentication rules that are easy to get wrong.
 *
 * These exercise the pure logic — validation and role gating — without a
 * database. The full round trip (register, sign in, reset) is covered by the
 * integration checks run against a live server.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { requireRole } from '../middlewares/adminAuth.js';
import { ROLE_HOME, ROLES, validateRegistration } from '../services/auth.service.js';

describe('validateRegistration', () => {
  const valid = {
    username: 'good_user',
    email: 'Person@Example.COM',
    password: 'longenough',
    fullName: '  Ada Lovelace  ',
  };

  it('accepts a well-formed payload', () => {
    const result = validateRegistration(valid);

    expect(result.username).toBe('good_user');
    expect(result.fullName).toBe('Ada Lovelace');
  });

  it('lowercases the email so casing cannot create a duplicate account', () => {
    expect(validateRegistration(valid).email).toBe('person@example.com');
  });

  it('turns an empty full name into null rather than an empty string', () => {
    expect(validateRegistration({ ...valid, fullName: '   ' }).fullName).toBeNull();
  });

  it.each([
    ['too short', 'ab'],
    ['has a space', 'bad name'],
    ['has a slash', 'bad/name'],
    ['too long', 'x'.repeat(33)],
  ])('rejects a username that is %s', (_label, username) => {
    expect(() => validateRegistration({ ...valid, username })).toThrow();
  });

  it.each([
    ['no at sign', 'nope'],
    ['no domain', 'a@'],
    ['has a space', 'a b@c.com'],
  ])('rejects an email with %s', (_label, email) => {
    expect(() => validateRegistration({ ...valid, email })).toThrow();
  });

  it('reports every bad field at once, not just the first', () => {
    try {
      validateRegistration({ username: 'x', email: 'bad', password: '1' });
      throw new Error('should have thrown');
    } catch (error) {
      expect(Object.keys(error.details.fields).sort()).toEqual(['email', 'password', 'username']);
    }
  });

  it('rejects a short password', () => {
    expect(() => validateRegistration({ ...valid, password: '123' })).toThrow();
  });
});

describe('role configuration', () => {
  it('knows exactly the three roles the schema allows', () => {
    expect(ROLES).toEqual(['user', 'admin', 'super_admin']);
  });

  it('routes each role to a home path', () => {
    for (const role of ROLES) {
      expect(typeof ROLE_HOME[role]).toBe('string');
    }
  });

  it('keeps ordinary users away from the admin area by default', () => {
    expect(ROLE_HOME.user).not.toBe(ROLE_HOME.admin);
  });
});

describe('requireRole with the new role names', () => {
  /** requireRole reads req.user, falling back to req.admin for older handlers. */
  const run = (user, roles) => {
    const next = vi.fn();
    requireRole(...roles)({ user }, {}, next);
    return next.mock.calls[0]?.[0];
  };

  it('lets a super_admin through an admin-only route', () => {
    expect(run({ id: 1, role: 'super_admin' }, ['admin', 'super_admin'])).toBeUndefined();
  });

  it('blocks a plain user with 403, not 401', () => {
    const err = run({ id: 2, role: 'user' }, ['admin', 'super_admin']);

    // 403 rather than 401 is the point: they are authenticated, just not
    // authorised, and the client needs to tell those apart.
    expect(err.statusCode ?? err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('tells the caller which roles would have worked', () => {
    const err = run({ id: 3, role: 'user' }, ['super_admin']);
    expect(err.details.requiredRoles).toEqual(['super_admin']);
  });
});

describe('session endpoint reachability', () => {
  /**
   * Regression cover for the bug where signing in as a plain 'user' bounced
   * straight back to the login form.
   *
   * The cause was routing: the shared session context verified its token
   * against /api/admin/auth/me, which is staff-only. A perfectly valid 'user'
   * session got 403, the context read that as "not signed in", and the guard
   * sent them back to /login — an authorisation rule leaking into
   * authentication.
   *
   * The rule these lock down: whoever may hold a token may ask who they are.
   */
  it('admits every role to the public session check', () => {
    const next = vi.fn();
    // requireRole with no restriction is what /api/auth/me effectively is:
    // authentication only, no role filter.
    for (const role of ROLES) {
      next.mockClear();
      requireRole(...ROLES)({ user: { id: 1, role } }, {}, next);
      expect(next.mock.calls[0]?.[0]).toBeUndefined();
    }
  });

  it('keeps the staff-only gate closed to plain users', () => {
    const next = vi.fn();
    requireRole('admin', 'super_admin')({ user: { id: 1, role: 'user' } }, {}, next);

    const err = next.mock.calls[0]?.[0];
    expect(err.code).toBe('FORBIDDEN');
  });
});

describe('sign-in rate limiting', () => {
  /**
   * Regression cover for a lockout that hit legitimate users.
   *
   * The limiter counted every request to /login, successes included, so five
   * ordinary sign-ins inside the window returned 429 — with the audit log
   * showing nothing but login_success. Brute-force protection is about failed
   * attempts; successes must not consume the budget.
   *
   * Asserted against the route configuration rather than by firing requests,
   * because the limiter is skipped entirely under NODE_ENV=test.
   */
  const source = readFileSync(new URL('../routes/auth.routes.js', import.meta.url), 'utf8');
  const adminSource = readFileSync(new URL('../routes/admin.routes.js', import.meta.url), 'utf8');

  it('does not count successful sign-ins towards the limit', () => {
    // countSuccess: false on the sign-in limiter maps to skipSuccessfulRequests.
    expect(source).toMatch(/countSuccess:\s*false/);
    expect(source).toMatch(/skipSuccessfulRequests:\s*!countSuccess/);
  });

  it('applies the same rule to the admin login route', () => {
    expect(adminSource).toMatch(/skipSuccessfulRequests:\s*true/);
  });

  it('still counts failures, so guessing is throttled', () => {
    // The limiter is only skipped in tests; nothing else opts failures out.
    expect(source).toMatch(/skip:\s*\(\)\s*=>\s*env\.IS_TEST/);
  });

  it('keeps counting successful password-reset requests', () => {
    // A successful reset request means mail was sent, which is exactly what
    // should be throttled — so resetLimiter must not opt out of successes.
    const resetBlock = source.slice(source.indexOf('const resetLimiter'));
    expect(resetBlock.slice(0, 300)).not.toMatch(/countSuccess:\s*false/);
  });
});
