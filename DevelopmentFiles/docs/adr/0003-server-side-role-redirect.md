# ADR-0003 — The server decides where a login lands

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

After a successful sign-in the client has to send the person somewhere: `/Dashboard`
for a `user`, `/AdminDashboard` for staff. The natural implementation reads the role
from the response and branches in the frontend.

That distributes one rule across every caller. Add a role later and each branch has to
be found and updated; miss one and a person lands on a page that refuses them.

## Decision

The sign-in and password-reset responses carry `redirectTo`, computed on the server
from a single `ROLE_HOME` map. `GET /api/auth/me` returns the same value as
`user.homePath`. The client navigates to what it is given and holds no role-to-route
knowledge.

This is a UX affordance, not a security boundary. Every protected route independently
verifies the role server-side; a forged `redirectTo` gets someone to a page that then
refuses them.

## Consequences

- Adding a role is one entry in `ROLE_HOME`.
- A signed-in account reaching a route above its level is redirected to its **own**
  home, not to the login form. Showing a login form to someone already signed in is a
  dead end — they have no way to satisfy it.
- Guard redirects carry the attempted path so sign-in resumes it, and carry a reason so
  the login page can say "your session expired" instead of appearing to have ignored a
  button press.

## The bug this decision was hardened by

Sign-in stored its tokens and then called `GET /api/auth/me` a second time to populate
the session. Only that second response set the context. When it failed — a 403 from a
cached bundle pointing at the staff-only `/me`, a dropped mobile connection, or simply
losing the race against the redirect — the context stayed empty, the route guard read
"not signed in", and the user was returned to the login form **with no error shown**,
while the server log recorded `login_success`.

A correct password appeared to do nothing at all. The fix is that sign-in trusts the
account object in its own response; the follow-up call is now an optional refresh.
7 tests assert the dashboard is reached even when that call is refused, fails at the
network level, or is slow.

**Rule adopted:** if a UI state depends on a second network call, decide what happens
when that call fails *before* shipping the first one.

## Alternatives considered

- **Client-side role map.** Rejected: the rule ends up copied into every caller.
- **A single dashboard that renders per role.** Viable, but it ships admin bundle code
  to every visitor and makes route-level authorisation harder to reason about.
