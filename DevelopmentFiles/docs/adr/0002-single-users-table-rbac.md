# ADR-0002 — One `users` table with a role column

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

The admin dashboard shipped before public accounts existed, so it had its own
`admin_users` table with its own roles (`owner`, `viewer`). When public sign-up was
added, the obvious move was a second table for ordinary users.

Two tables means two of everything: two password-hashing paths, two token issuers, two
sets of lockout rules. Worse, it makes promotion a data migration — turning a user into
an admin would mean deleting a row here and inserting one there, with the audit trail
broken across the gap.

## Decision

One `users` table. Authority is a `role` column constrained to
`('user', 'admin', 'super_admin')`, defaulting to `'user'`.

The migration is idempotent: a `DO $$` block renames `admin_users` if it is still
present and remaps `owner → super_admin`, `viewer → user`, so the script is safe to run
against a fresh database or a half-migrated one.

Authorisation is enforced by composable middleware — `requireAuth`, `requireAdmin`,
`requireRole(...)` — rather than by checks scattered through route handlers.

## Consequences

- Promotion is `UPDATE users SET role = 'admin'`. Identity, history and audit rows
  survive it.
- A single sign-in path means a single place to fix a sign-in bug. Three were found and
  fixed in one pass because there was only one path to inspect.
- The role check is centralised, so the distinction between "who are you" (401
  `AUTH_REQUIRED`) and "you may not do this" (403 `FORBIDDEN`, with the roles that would
  suffice) is uniform across every protected route. The client can tell a stale session
  apart from a genuine refusal without parsing prose.
- **Privilege is never claimed at sign-up.** `POST /register` ignores any role in the
  request body and writes `'user'`. Elevation happens only through an authenticated
  admin action.

## Alternatives considered

- **Separate `admin_users` table.** Rejected: duplicated auth logic, and promotion
  becomes a cross-table migration that severs the audit trail.
- **A permissions join table.** Correct for a product with per-resource grants. Here
  there are three tiers with strict containment, so a column is enough — and a column
  cannot drift out of sync with itself.
