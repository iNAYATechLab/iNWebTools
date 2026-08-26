import { describe, expect, it, vi } from 'vitest';
import { requireRole } from '../middlewares/adminAuth.js';

describe('Super Admin Security & Role Guards', () => {
  const run = (admin, roles) => {
    const next = vi.fn();
    requireRole(...roles)({ admin }, {}, next);
    return next.mock.calls[0]?.[0];
  };

  it('allows super_admin role to access master management actions', () => {
    const err = run({ id: 1, username: 'master_admin', role: 'super_admin' }, ['super_admin']);
    expect(err).toBeUndefined();
  });

  it('rejects regular admin from super_admin exclusive actions', () => {
    const err = run({ id: 2, username: 'sub_admin', role: 'admin' }, ['super_admin']);
    expect(err).toBeDefined();
    expect(err.statusCode ?? err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('rejects regular user from administrative actions', () => {
    const err = run({ id: 3, username: 'regular_user', role: 'user' }, ['super_admin', 'admin']);
    expect(err).toBeDefined();
    expect(err.statusCode ?? err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('rejects unauthenticated requests', () => {
    const err = run(undefined, ['super_admin']);
    expect(err).toBeDefined();
    expect(err.statusCode ?? err.status).toBe(401);
    expect(err.code).toBe('AUTH_REQUIRED');
  });
});
