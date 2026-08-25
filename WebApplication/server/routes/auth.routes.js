/**
 * Public authentication: sign-up, sign-in, and password reset.
 *
 * Mounted at /api/auth. The dashboard's own endpoints under /api/admin/auth
 * stay where they are so existing clients keep working; both issue the same
 * tokens against the same `users` table, so a token from either is accepted
 * everywhere.
 *
 * Two deliberate asymmetries in what the responses reveal:
 *
 *   - Sign-in never says whether an account exists. "Incorrect username or
 *     password" covers both, so the endpoint cannot enumerate accounts.
 *   - Sign-up does say which field clashed. Anyone can discover that by
 *     trying to register, so hiding it only turns a clear error into a
 *     guessing game.
 *   - Forgot-password always answers the same, whether or not the address is
 *     known — otherwise it becomes an account-enumeration oracle.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';
import { requireAuth, requireDatabase } from '../middlewares/adminAuth.js';
import {
  ROLE_HOME,
  createPasswordResetToken,
  findActiveUserById,
  issueTokens,
  recordAudit,
  registerUser,
  resetPasswordWithToken,
  verifyCredentials,
} from '../services/auth.service.js';
import { verifyToken } from '../services/auth.service.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export const authRouter = Router();

const ok = (req, res, data, status = 200) =>
  res.status(status).json({
    success: true,
    data,
    meta: { requestId: req.id, timestamp: new Date().toISOString() },
  });

/**
 * Shared limiter factory — same envelope as the rest of the API.
 *
 * `countSuccess: false` makes the limiter ignore 2xx responses. Brute-force
 * protection is about *failed* attempts; counting successes too meant five
 * ordinary sign-ins locked the account holder out for fifteen minutes.
 */
function limiter({ windowMs, max, code, message, countSuccess = true }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.IS_TEST,
    skipSuccessfulRequests: !countSuccess,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: { code, message },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    },
  });
}

const signInLimiter = limiter({
  windowMs: env.ADMIN_LOGIN_WINDOW_MS,
  max: env.ADMIN_LOGIN_MAX_ATTEMPTS,
  code: 'TOO_MANY_ATTEMPTS',
  message: 'Too many failed sign-in attempts. Try again later.',
  // Only wrong passwords count towards the limit.
  countSuccess: false,
});

// Registration is rate-limited per IP as well: without it the endpoint is a
// free way to fill the table with junk accounts.
const registerLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  code: 'TOO_MANY_ATTEMPTS',
  message: 'Too many accounts created from this address. Try again in an hour.',
});

// Password-reset requests trigger email; unlimited requests are a spam relay
// pointed at whichever address the attacker names.
const resetLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  code: 'TOO_MANY_ATTEMPTS',
  message: 'Too many reset requests. Try again shortly.',
});

/* ---------------- Sign up ---------------- */

authRouter.post(
  '/register',
  registerLimiter,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await registerUser({
      username: req.body?.username,
      email: req.body?.email,
      password: req.body?.password,
      fullName: req.body?.fullName,
    });

    await recordAudit({
      username: user.username,
      action: 'register',
      detail: `role=${user.role}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Signing the new account straight in saves a pointless second form.
    ok(req, res, { user, ...issueTokens(user) }, 201);
  }),
);

/* ---------------- Sign in ---------------- */

authRouter.post(
  '/login',
  signInLimiter,
  requireDatabase,
  asyncHandler(async (req, res) => {
    // Accept either identifier under one field name.
    const identifier = String(
      req.body?.identifier ?? req.body?.username ?? req.body?.email ?? '',
    ).trim();
    const password = String(req.body?.password ?? '');

    if (!identifier || !password) {
      throw ApiError.badRequest(
        'MISSING_CREDENTIALS',
        'Enter your username or email and your password.',
      );
    }

    const user = await verifyCredentials(identifier, password);

    if (!user) {
      await recordAudit({
        username: identifier,
        action: 'login_failed',
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect username or password.');
    }

    await recordAudit({
      username: user.username,
      action: 'login_success',
      detail: `role=${user.role}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // `homePath` is decided server-side from the stored role. The client only
    // follows it — it never picks its own destination from a value it holds.
    ok(req, res, { user, redirectTo: user.homePath, ...issueTokens(user) });
  }),
);

/* ---------------- Session ---------------- */

/**
 * The signed-in account, whatever its role.
 *
 * Distinct from /api/admin/auth/me, which is staff-only. The shared session
 * context calls this one: a 'user' asking who they are is a perfectly ordinary
 * request, and answering 403 made the client treat a valid session as no
 * session at all — signing in bounced straight back to the login form.
 */
authRouter.get('/me', requireDatabase, requireAuth, (req, res) =>
  ok(req, res, {
    user: {
      ...req.user,
      homePath: ROLE_HOME[req.user.role] ?? '/',
    },
  }),
);

authRouter.post(
  '/logout',
  requireDatabase,
  requireAuth,
  asyncHandler(async (req, res) => {
    await recordAudit({
      username: req.user.username,
      action: 'logout',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    ok(req, res, { loggedOut: true });
  }),
);

authRouter.post(
  '/refresh',
  requireDatabase,
  asyncHandler(async (req, res) => {
    const token = String(req.body?.refreshToken ?? '');
    if (!token) throw ApiError.badRequest('MISSING_TOKEN', 'A refresh token is required.');

    const payload = verifyToken(token, 'refresh');
    const user = await findActiveUserById(Number(payload.sub));
    if (!user) throw new ApiError(401, 'AUTH_REQUIRED', 'This account is no longer active.');

    ok(req, res, { user, ...issueTokens(user) });
  }),
);

/* ---------------- Forgot / reset password ---------------- */

authRouter.post(
  '/forgot-password',
  resetLimiter,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? '').trim();
    if (!email) throw ApiError.badRequest('MISSING_EMAIL', 'Enter the email on your account.');

    const issued = await createPasswordResetToken(email);

    if (issued) {
      const link = `${env.PUBLIC_APP_URL}/reset-password?token=${issued.token}`;

      // No mail transport is configured yet, so the link goes to the server
      // log. Swapping this for an SMTP send is the only change needed — the
      // token lifecycle around it is already complete.
      logger.info('[auth] Password reset requested', {
        email,
        link,
        expiresInMinutes: issued.expiresInMinutes,
      });

      await recordAudit({
        username: email,
        action: 'password_reset_requested',
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    // Identical response either way: a different answer for unknown addresses
    // would turn this into an account-enumeration oracle.
    ok(req, res, {
      message: 'If that address has an account, a reset link is on its way.',
      // Development convenience only — never expose the token in production.
      ...(env.IS_PRODUCTION || !issued
        ? {}
        : { devToken: issued.token, devLink: `/reset-password?token=${issued.token}` }),
    });
  }),
);

authRouter.post(
  '/reset-password',
  resetLimiter,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const token = String(req.body?.token ?? '');
    const password = String(req.body?.password ?? '');

    if (!token) {
      throw ApiError.badRequest('MISSING_TOKEN', 'This reset link is incomplete.');
    }

    const user = await resetPasswordWithToken(token, password);

    await recordAudit({
      username: user.username,
      action: 'password_reset_completed',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    ok(req, res, {
      message: 'Your password has been changed. Sign in with the new one.',
      redirectTo: ROLE_HOME[user.role] ?? '/',
    });
  }),
);
