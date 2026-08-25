# Architecture Decision Records

An ADR records a decision that was **hard to make and expensive to reverse**, together
with the reasoning available at the time. Not every choice needs one; a decision earns
an ADR when a competent engineer joining later would otherwise ask "why on earth is it
done this way?"

Each record is immutable once merged. When a decision is revisited, the old ADR is
marked `Superseded by ADR-NNNN` and a new one is written. The wrong reasoning, kept
visible, is more useful than a tidy document that hides how the system actually grew.

## Format

```
# ADR-NNNN — Title

- **Status:** Proposed | Accepted | Superseded by ADR-NNNN
- **Date:** YYYY-MM-DD

## Context
What forced a decision. Constraints, measurements, failed attempts.

## Decision
What was chosen, stated plainly.

## Consequences
What this costs, what it rules out, what has to be watched.

## Alternatives considered
What else was on the table and the specific reason it lost.
```

## Index

| ADR                                          | Title                                        | Status   |
| -------------------------------------------- | -------------------------------------------- | -------- |
| [0001](./0001-postgresql-over-sqlite.md)     | PostgreSQL over SQLite for the primary store | Accepted |
| [0002](./0002-single-users-table-rbac.md)    | One `users` table with a role column         | Accepted |
| [0003](./0003-server-side-role-redirect.md)  | The server decides where a login lands       | Accepted |
| [0004](./0004-release-artifact-by-exclusion.md) | Package releases by exclusion, not allow-list | Accepted |
