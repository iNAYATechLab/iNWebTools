/**
 * Admin authentication: password verification, JWT issuing and session lookup.
 *
 * Design notes
 *   - Passwords are bcrypt hashes (cost 12). Plaintext never touches the DB.
 *   - A failed login is deliberately indistinguishable from an unknown user,
 *     so the endpoint cannot be used to enumerate usernames.
 *   - Access tokens are short-lived; the refresh token is a separate JWT with
 *     a distinct `typ` claim so an access token can never be replayed as a
 *     refresh token (or the reverse).
 */

import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { MIN_ADMIN_PASSWORD_LENGTH, env } from '../config/env.js';
import { query, queryOne, withTransaction } from '../db/index.js';
import { ApiError } from '../utils/ApiError.js';

const ACCESS = 'access';
const REFRESH = 'refresh';

/** Every role the system knows, lowest privilege first. */
export const ROLES = ['user', 'admin', 'super_admin'];

/** Where each role lands after signing in. */
export const ROLE_HOME = {
  user: '/Dashboard',
  admin: '/AdminDashboard',
  super_admin: '/AdminDashboard',
};

/** Reset links are short-lived: long enough to check email, short enough to matter. */
const RESET_TTL_MINUTES = 30;

/** Columns safe to return to a client. Never includes password_hash. */
const PUBLIC_COLUMNS = 'id, username, email, full_name, role, is_active, last_login_at';

/** Shape a database row for the API. */
function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? null,
    fullName: row.full_name ?? null,
    role: row.role,
    homePath: ROLE_HOME[row.role] ?? '/',
  };
}

function assertConfigured() {
  if (!env.JWT_CONFIGURED) {
    throw new ApiError(
      503,
      'AUTH_NOT_CONFIGURED',
      'Admin authentication is not configured. Set JWT_SECRET (32+ characters) on the server.',
    );
  }
}

/** Sign an access + refresh pair for a user row. */
export function issueTokens(user) {
  assertConfigured();

  const base = {
    sub: String(user.id),
    username: user.username,
    email: user.email ?? null,
    role: user.role,
  };

  const accessToken = jwt.sign({ ...base, typ: ACCESS }, env.JWT_SECRET, {
    expiresIn: `${env.JWT_ACCESS_TTL_MIN}m`,
    issuer: env.JWT_ISSUER,
  });

  const refreshToken = jwt.sign({ ...base, typ: REFRESH }, env.JWT_SECRET, {
    expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d`,
    issuer: env.JWT_ISSUER,
  });

  return {
    accessToken,
    refreshToken,
    expiresInSeconds: env.JWT_ACCESS_TTL_MIN * 60,
    tokenType: 'Bearer',
  };
}

/**
 * Verify a token and confirm it is of the expected kind.
 * @param {string} token
 * @param {'access'|'refresh'} expectedType
 */
export function verifyToken(token, expectedType = ACCESS) {
  assertConfigured();

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { issuer: env.JWT_ISSUER });
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    throw new ApiError(
      401,
      expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      expired ? 'Session expired. Please sign in again.' : 'Invalid authentication token.',
    );
  }

  if (payload.typ !== expectedType) {
    throw new ApiError(401, 'TOKEN_INVALID', 'Token is not valid for this operation.');
  }
  return payload;
}

/**
 * Check a username/password pair.
 * @returns the user row, or null when the credentials do not match.
 */
export async function verifyCredentials(identifier, password) {
  // One field for both identifiers: asking people to remember which one they
  // signed up with is a needless failure. LOWER() matches the unique indexes.
  const user = await queryOne(
    `SELECT id, username, email, full_name, password_hash, role, is_active
       FROM users
      WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
      LIMIT 1`,
    [identifier, identifier],
  );

  // Compare against a dummy hash when the user is unknown so both paths take
  // roughly the same time and cannot be distinguished by a stopwatch.
  const hash =
    user?.password_hash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
  const matches = await bcrypt.compare(password, hash);

  if (!user || !matches || !user.is_active) return null;

  await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
  return toPublicUser(user);
}

/** Look up a user referenced by a token, so revoked accounts stop working. */
export async function findActiveUserById(id) {
  return queryOne(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ? AND is_active = TRUE LIMIT 1`, [
    id,
  ]);
}

/** Record an authentication or privileged action for the audit trail. */
export async function recordAudit({ username, action, detail, ip, userAgent }) {
  try {
    await query(
      'INSERT INTO admin_audit_log (username, action, detail, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [
        username ?? null,
        action,
        detail ?? null,
        ip ?? null,
        (userAgent ?? '').slice(0, 512) || null,
      ],
    );
  } catch {
    // Auditing must never break the request it is describing.
  }
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await queryOne('SELECT id, password_hash FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'Account no longer exists.');

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) throw new ApiError(400, 'PASSWORD_INCORRECT', 'The current password is incorrect.');

  if (typeof newPassword !== 'string' || newPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw ApiError.badRequest(
      'PASSWORD_TOO_WEAK',
      `The new password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters long.`,
      { minLength: MIN_ADMIN_PASSWORD_LENGTH },
    );
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
}

/* ---------------- Registration ---------------- */

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;
// Deliberately permissive. Strict RFC 5322 regexes reject valid addresses;
// the only real proof an address works is sending to it.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validate a sign-up payload.
 * @returns {{username: string, email: string, password: string, fullName: string|null}}
 */
export function validateRegistration({ username, email, password, fullName }) {
  const errors = {};

  const cleanUsername = String(username ?? '').trim();
  const cleanEmail = String(email ?? '')
    .trim()
    .toLowerCase();
  const cleanName = String(fullName ?? '').trim();

  if (!USERNAME_RE.test(cleanUsername)) {
    errors.username = 'Use 3–32 characters: letters, numbers, dot, underscore or hyphen.';
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    errors.email = 'Enter a valid email address.';
  }
  if (typeof password !== 'string' || password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`;
  }
  if (cleanName.length > 120) {
    errors.fullName = 'Keep this under 120 characters.';
  }

  if (Object.keys(errors).length > 0) {
    throw ApiError.badRequest('VALIDATION_FAILED', 'Please correct the highlighted fields.', {
      fields: errors,
    });
  }

  return {
    username: cleanUsername,
    email: cleanEmail,
    password,
    fullName: cleanName || null,
  };
}

/**
 * Create an account. Always role 'user' — privilege is granted by an existing
 * admin afterwards, never claimed by the person signing up.
 */
export async function registerUser(input) {
  const { username, email, password, fullName } = validateRegistration(input);

  const clash = await queryOne(
    'SELECT username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
    [username, email],
  );
  if (clash) {
    // Which field clashed is already discoverable by trying to register, so
    // saying so is honest and saves a guessing game. The sign-in endpoint
    // stays deliberately vague; this one cannot be.
    const field = clash.username?.toLowerCase() === username.toLowerCase() ? 'username' : 'email';
    throw ApiError.badRequest('ALREADY_REGISTERED', 'That account already exists.', {
      fields: {
        [field]: field === 'username' ? 'This username is taken.' : 'This email is registered.',
      },
    });
  }

  const hash = await bcrypt.hash(password, 12);

  const created = await queryOne(
    `INSERT INTO users (username, email, password_hash, full_name, role)
     VALUES (?, ?, ?, ?, 'user')
     RETURNING ${PUBLIC_COLUMNS}`,
    [username, email, hash, fullName],
  );

  return toPublicUser(created);
}

/* ---------------- Password reset ---------------- */

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

/**
 * Begin a reset. Returns the raw token when the address is known, null when it
 * is not — the caller answers identically either way so the endpoint cannot be
 * used to discover which addresses have accounts.
 */
export async function createPasswordResetToken(email) {
  const user = await queryOne(
    'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND is_active = TRUE LIMIT 1',
    [String(email ?? '').trim()],
  );
  if (!user) return null;

  // Invalidate outstanding tokens: requesting a new link should retire the old
  // one, or a forwarded email stays usable after the owner resets again.
  await query(
    'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
    [user.id],
  );

  const token = crypto.randomBytes(32).toString('base64url');
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, NOW() + INTERVAL '${RESET_TTL_MINUTES} minutes')`,
    [user.id, sha256(token)],
  );

  return { token, expiresInMinutes: RESET_TTL_MINUTES };
}

/** Consume a reset token and set the new password. */
export async function resetPasswordWithToken(token, newPassword) {
  if (typeof newPassword !== 'string' || newPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw ApiError.badRequest(
      'PASSWORD_TOO_WEAK',
      `Use at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`,
      { fields: { password: `Use at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.` } },
    );
  }

  const row = await queryOne(
    `SELECT id, user_id FROM password_reset_tokens
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
      LIMIT 1`,
    [sha256(String(token ?? ''))],
  );
  if (!row) {
    throw ApiError.badRequest(
      'RESET_TOKEN_INVALID',
      'This reset link has expired or already been used. Request a new one.',
    );
  }

  const hash = await bcrypt.hash(newPassword, 12);

  // Marking the token used and changing the password must happen together:
  // if the update succeeded and the mark did not, the link would stay live.
  await withTransaction(async (tx) => {
    await tx.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, row.user_id]);
    await tx.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [row.id]);
  });

  return queryOne(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [row.user_id]);
}
