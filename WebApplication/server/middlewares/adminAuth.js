/**
 * JWT guards and role-based access control.
 *
 * Two checks on every protected route, deliberately both: the signature must
 * verify, *and* the account must still exist and be active. Signature alone
 * would keep a disabled account working until its token expired.
 *
 * `requireAuth` admits any signed-in user; `requireAdmin` narrows that to
 * staff. Both populate `req.user`, and `requireRole` filters on top.
 */

import { isReady } from '../db/index.js';
import { findActiveUserById, verifyToken } from '../services/auth.service.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

/** Pull a bearer token out of the Authorization header. */
function readBearer(req) {
  const header = req.get('authorization') ?? '';
  const [scheme, value] = header.split(' ');
  if (!value || scheme.toLowerCase() !== 'bearer') return null;
  return value.trim() || null;
}

/** 503 when the dashboard's database is down, so the UI can say so plainly. */
export function requireDatabase(req, res, next) {
  if (!isReady()) {
    return next(
      new ApiError(
        503,
        'DATABASE_UNAVAILABLE',
        'The admin database is not reachable. The transcription API is unaffected.',
      ),
    );
  }
  next();
}

/** Roles allowed into the operator dashboard. */
const STAFF_ROLES = ['admin', 'super_admin'];

/**
 * Any authenticated account, whatever its role.
 * Sets `req.user` — and `req.admin` as an alias, so existing handlers that
 * read `req.admin` keep working after the single-table migration.
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Sign in to continue.');
  }

  const payload = verifyToken(token, 'access');
  const user = await findActiveUserById(Number(payload.sub));

  if (!user) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'This account is no longer active.');
  }

  // `fullName` is part of this shape because /login returns it and /me must
  // agree: the dashboard greets people by full name, so dropping it here made
  // the greeting silently downgrade to the username on the next page load.
  req.user = {
    id: user.id,
    username: user.username,
    email: user.email ?? null,
    fullName: user.full_name ?? null,
    role: user.role,
  };
  req.admin = req.user;
  next();
});

/**
 * Authenticated *and* staff. A signed-in 'user' gets 403, not 401: they are
 * authenticated, just not authorised, and the client needs to tell those
 * apart to decide between re-login and an access-denied screen.
 */
export const requireAdmin = [
  requireAuth,
  (req, res, next) => {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return next(
        new ApiError(403, 'FORBIDDEN', 'This area is limited to administrators.', {
          requiredRoles: STAFF_ROLES,
        }),
      );
    }
    next();
  },
];

/**
 * Restrict a route to specific roles. Runs after requireAuth or requireAdmin.
 * @param {...('user'|'admin'|'super_admin')} roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.user ?? req.admin;
    if (!user) {
      return next(new ApiError(401, 'AUTH_REQUIRED', 'Sign in to continue.'));
    }
    if (!roles.includes(user.role)) {
      return next(
        new ApiError(403, 'FORBIDDEN', 'Your role does not permit this action.', {
          requiredRoles: roles,
        }),
      );
    }
    next();
  };
}
